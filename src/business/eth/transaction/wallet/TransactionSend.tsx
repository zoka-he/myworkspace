import copyToClip from '@/src/utils/common/copy';
import { Form, message, Modal, Descriptions, Alert, Row, Col, Card, Space, Segmented, Input, Select, Tag, Spin, Checkbox, Button, InputNumber, Divider, Typography, Dropdown } from 'antd';
import { useState, useEffect, useMemo } from 'react';
import { SendOutlined, WalletOutlined, SettingOutlined, ReloadOutlined, ExclamationCircleOutlined, EditOutlined, UnorderedListOutlined } from "@ant-design/icons";
import transactionSendStyles from './TransactionSend.module.scss';
import fetch from '@/src/fetch';
import { useWalletContext } from '../WalletContext';
import { readableAmount } from '@/src/utils/ethereum/metamask';
import { eth2wei, gwei2wei, wei2eth } from '../common/etherConvertUtil';
import EtherscanUtil from '../common/etherscanUtil';
import _ from 'lodash';
import { useBalance, useChainId, useConnection, useConnectors, useEstimateFeesPerGas, useEstimateGas, useGasPrice, usePublicClient, useSendTransaction, useSendTransactionSync, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, parseGwei, stringToHex, UserRejectedRequestError } from 'viem';

interface WalletActionsProps {
    // walletInfo?: IWalletInfo | null;
}

// 付款表单数据类型
interface SendFormData {
    amountUnit: 'wei' | 'eth' | 'gwei';
    to: string;
    amount: string;
    gasPrice: string;
    gasLimit: string;
    data?: string;
}

interface TxData {
    amount: bigint;
    gasPrice: bigint;
    gasLimit: bigint;
    to: string;
    data?: string;
}

// 账户列表项类型
interface IEthAccountItem {
    id: number;
    name: string;
    address: string;
    balance?: number;
    network?: string;
    chain_id?: number;
    unit?: string;
}

const wei2usd = (amount?: bigint | string, eth2usd?: string | number) => {
    if (!amount || !eth2usd) {
        return '--';
    }

    try {
        let _amount = typeof amount === 'string' ? BigInt(amount) : amount;
        let _eth2usd = typeof eth2usd === 'string' ? parseFloat(eth2usd) : eth2usd;

        return (wei2eth(_amount, 8) * _eth2usd).toFixed(2); // 小于1美分无意义
    } catch (error: any) {
        console.error(error);
        return '--';
    }
}

function processFormData(formData: SendFormData): TxData {

    let txData: TxData = {
        amount: BigInt(0),
        gasPrice: BigInt(0),
        gasLimit: BigInt(0),
        to: '',
        data: '',
    };

    if (!formData) {
        return txData;
    }

    if (formData.amount && formData.amountUnit === 'eth') {
        txData.amount = parseEther(formData.amount);
    } else if (formData.amount && formData.amountUnit === 'gwei') {
        txData.amount = parseGwei(formData.amount);
    } else if (formData.amount && formData.amountUnit === 'wei') {
        if (!/^\d+$/.test(formData.amount)) {
            message.error('金额必须是有效的整数');
        } else {
            txData.amount = BigInt(formData.amount);
        }
    }

    if (formData.gasPrice) {
        if (!/^\d+$/.test(formData.gasPrice)) {
            message.error('Gas Price必须是有效的整数');
        } else {
            txData.gasPrice = BigInt(formData.gasPrice);
        }
    }

    if (formData.gasLimit) {
        if (!/^\d+$/.test(formData.gasLimit)) {
            message.error('Gas Limit必须是有效的整数');
        } else {
            txData.gasLimit = BigInt(formData.gasLimit);
        }
    }

    if (formData.to) {
        if (!/^0x[a-fA-F0-9]{40}$/.test(formData.to)) {
            message.error('接收地址必须是有效的以太坊地址');
        } else {
            txData.to = formData.to.toLowerCase();
        }
    }

    if (formData.data) {
        txData.data = formData.data;
    }

    return txData;
}

export default function TransactionSend(props: WalletActionsProps) {
    // const { isWalletConnected, networkInfo, accountInfo, getWalletTool } = useWalletContext();
    const connection = useConnection();
    const address = connection.address;
    const chainId = connection.chainId;
    const gasPrice = useGasPrice();
    const sendTransaction = useSendTransaction();
    const publicClient = usePublicClient();

    const [form] = Form.useForm<SendFormData>();
    const [loading, setLoading] = useState(false);
    // const [estimatedGas, setEstimatedGas] = useState<string>('21000');
    // const [estimatedFee, setEstimatedFee] = useState<string>('0.001');

    // 接收地址输入模式：manual-手动输入, select-选择账户
    const [addressInputMode, setAddressInputMode] = useState<'manual' | 'select'>('select');
    const [accountList, setAccountList] = useState<IEthAccountItem[]>([]);
    const [accountsLoading, setAccountsLoading] = useState(false);
    const [onlyMyAccounts, setOnlyMyAccounts] = useState(true); // 是否仅显示我的账户
    const [sendAmountUnit, setSendAmountUnit] = useState<'wei' | 'eth' | 'gwei'>('eth');

    
    useEffect(() => {
        fetchMarketValue();
        const timer =setInterval(() => {
            fetchMarketValue();
        }, 1000 * 30);
        return () => clearInterval(timer);
    }, []);


    // 定期获取以太币/USD价格
    const [eth2usd, setEth2usd] = useState('--');
    const fetchMarketValue = async () => {

        if (!chainId) {
            return;
        }

        try {
            const etherscanUtil = new EtherscanUtil(EtherscanUtil.EndPointUrl.MAINNET, chainId);
            const latestPrice = await etherscanUtil.getLatestPrice(chainId);
            setEth2usd(parseFloat(latestPrice.ethusd).toFixed(6));
        } catch (error: any) {
            console.error(error);
            message.error(error.message || '获取最新价格失败');
        }
    }

    const calculateUsdAmount = () => {
        return wei2usd(txData?.amount, eth2usd);
    }

    const formValues = Form.useWatch([], form);
    const txData = useMemo(() => {
        return processFormData(formValues);
    }, [formValues, sendAmountUnit])

    // 加载账户列表
    const loadAccounts = async () => {
        setAccountsLoading(true);
        try {
            let params: any = {
                page: 1,
                limit: 100
            };

            if (chainId) {
                params.chain_id = chainId;
            }

            // @ts-ignore
            const { data } = await fetch.get('/api/eth/account', { params: params });
            let validReceivers = data.filter((item: any) => {
                // 基础过滤：排除当前地址
                const isNotCurrentAddress = item.address.toLowerCase() !== address?.toLowerCase();
                const hasPrivateKey = item.private_key !== null && item.private_key !== '';
                
                // 过滤网络匹配的对手方钱包地址
                let networkMatch = item.chain_id === chainId;
                
                // 如果勾选了"仅限我的账户"，只显示有私钥的账户
                if (onlyMyAccounts) {
                    return isNotCurrentAddress && networkMatch && hasPrivateKey;
                }
                
                // 未勾选时，显示所有符合网络条件的账户
                return isNotCurrentAddress && networkMatch;
            });
            
            setAccountList(validReceivers || []);
        } catch (e: any) {
            console.error('加载账户列表失败:', e);
            message.error(e?.message || '加载账户列表失败');
        } finally {
            setAccountsLoading(false);
        }
    };

    // 当切换到选择模式时，或钱包变动时，或过滤条件变化时，加载账户列表
    useEffect(() => {
        if (addressInputMode === 'select') {
            loadAccounts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [addressInputMode, connection.address, connection.chainId, onlyMyAccounts]);

    // 缩短地址显示
    const shortenAddress = (address: string) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // 显示二次确认对话框
    const showConfirmModal = (values: SendFormData) => {
        let txData = processFormData(values);
        const estimatedFee = BigInt(txData.gasPrice) * BigInt(txData.gasLimit);
        const totalAmount = txData.amount + estimatedFee;

        const feePercent = estimatedFee * BigInt(10000) / totalAmount;
        const feePercentString = (Number(feePercent.toString()) / 100).toString() + '%';
        
        Modal.confirm({
            title: '确认发送交易',
            icon: <ExclamationCircleOutlined />,
            content: (
                <div style={{ marginTop: 16 }}>
                    <Descriptions column={1} size="small" bordered>
                        <Descriptions.Item label="接收地址">
                            <div style={{ wordBreak: 'break-all' }}>{txData.to}</div>
                        </Descriptions.Item>
                        <Descriptions.Item label="发送金额">
                            <span style={{ fontSize: 16, fontWeight: 'bold', color: '#ff4d4f' }}>
                                {readableAmount(txData.amount.toString())}
                            </span>
                        </Descriptions.Item>
                        <Descriptions.Item label="Gas Price">
                            {readableAmount(txData.gasPrice.toString())}
                        </Descriptions.Item>
                        <Descriptions.Item label="Gas Limit">
                            {readableAmount(txData.gasLimit.toString())}
                        </Descriptions.Item>
                        <Descriptions.Item label="预估费用">
                            {readableAmount(estimatedFee.toString())}
                        </Descriptions.Item>
                        <Descriptions.Item label="总计">
                            <span style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>
                                {readableAmount(totalAmount.toString())}
                            </span>
                            <span style={{ fontSize: 12, color: '#999' }}>
                                （交易费用占：{feePercentString}）
                            </span>
                        </Descriptions.Item>
                    </Descriptions>
                    <Alert
                        message="重要提示"
                        description="交易一旦发送将无法撤销，请仔细核对接收地址和金额！"
                        type="warning"
                        showIcon
                        style={{ marginTop: 16 }}
                    />
                </div>
            ),
            okText: '确认发送',
            cancelText: '取消',
            width: 600,
            okButtonProps: {
                danger: true,
            },
            onOk: async () => {
                await handleSendTransaction(values);
            },
        });
    };

    // 发送交易
    const handleSendTransaction = async (values: SendFormData) => {
        try {
            setLoading(true);
            
            // 检查是否有钱包连接
            if (!connection.isConnected) {
                message.error('请先连接钱包');
                return;
            }

            message.loading({ content: '正在发送交易...', key: 'sendTx', duration: 0 });

            let result = await sendTransaction.mutateAsync({
                to: txData.to as `0x${string}`,
                value: txData.amount,
                gas: txData.gasLimit,
                gasPrice: txData.gasPrice,
                data: stringToHex(txData.data || ''),
            });
            
            message.loading({ 
                content: `交易已发送，等待确认... (Hash: ${result.slice(0, 10)}...)`, 
                key: 'sendTx',
                duration: 0 
            });

            
            if (!publicClient) {
                message.error('公共客户端未连接，这看起来是一个意外错误，请自行在钱包查看交易状态。');
                return;
            }

            let receipt = await publicClient.waitForTransactionReceipt({
                hash: result,
            });

            if (receipt.status === 'success') {
                message.success('交易成功');
            } else {
                message.error('交易失败');
            }
            
        } catch (error: any) {
            // console.error('交易发送失败:', error);
            // console.debug(error.data);

            // wagmi 的 error 结构通常有 code, message, cause, 和 details 字段。
            // 可以输出所有的 error 结构方便排查，并针对常见的 code 做特殊处理，比如 4001（用户拒绝），-32000（可能余额不足）。
            // 可以参考 wagmi 的官方文档: https://wagmi.sh/react/faq#how-are-errors-handled
            // 你可以这样做更友好的适配和调试：

            // 打印 error 的详细结构，方便诊断
            // error 可能是一个对象，但其属性往往不可枚举，直接console.log(error)无法展开全部，推荐如下方式
            if (typeof error === 'object' && error !== null) {
                // 尝试输出所有属性和值（包括不可枚举属性和Symbol属性），而不是仅用 toString
                const ownKeys = [
                    ...Object.getOwnPropertyNames(error),
                    ...Object.getOwnPropertySymbols(error) as any,
                ];
                const allProps: Record<string | symbol, any> = {};
                for (const key of ownKeys) {
                    // @ts-ignore
                    allProps[key] = error[key];
                }
                console.debug('wagmi error object (full property map):', allProps);
            } else {
                // 如果不是对象直接打印
                console.debug('wagmi error object:', error);
            }

            // 常见错误处理：code 4001 用户取消交易，-32000 余额不足/nonce 问题等
            if (error.cause.code === 4001 || error.shortMessage === 'User rejected the request.') {
                message.warning({ content: '您已取消交易', key: 'sendTx' });
            } else if (error.cause.code === -32000) {
                message.error({ content: '交易失败：可能余额不足或 Gas 设置过低', key: 'sendTx' });
            } else if (error.message) {
                message.error({ content: `交易失败: ${error.message}`, key: 'sendTx', duration: 8 });
            } else {
                message.error({ content: `交易失败: ${JSON.stringify(error)}`, key: 'sendTx', duration: 8 });
            }
        } finally {
            setLoading(false);
        }
    };

    // 处理表单提交（显示确认对话框）
    const handleSend = async (values: SendFormData) => {
        showConfirmModal(values);
    };

    const setGasPrice = (gasPriceLevel: string) => {
        let result: bigint = BigInt(0);

        let gasPrice_standard = gasPrice.data || BigInt(0);

        if (gasPriceLevel === 'fast2') {
            result = gasPrice_standard * BigInt(2);
        } else if (gasPriceLevel === 'fast1') {
            result = gasPrice_standard * BigInt(3) / BigInt(2); // 1.5倍
        } else if (gasPriceLevel === 'slow') {
            result = gasPrice_standard * BigInt(4) / BigInt(5); // 0.8倍
        } else if (gasPriceLevel === 'standard') {
            result = gasPrice_standard;
        } else if (typeof gasPriceLevel === 'string' && _.isNumber(gasPriceLevel)) {
            result = BigInt(gasPriceLevel);
        }

        form.setFieldValue('gasPrice', result.toString());
        
    };

    function setGasLimitByLevel(gasLimitLevel: string = 'default') {
        let result: bigint = BigInt(21000); // 默认21000
        form.setFieldValue('gasLimit', result.toString());
    }

    // 验证地址格式
    const validateAddress = (_: any, value: string) => {
        if (!value) {
            return Promise.reject(new Error('请输入接收地址'));
        }
        if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
            return Promise.reject(new Error('请输入有效的以太坊地址'));
        }
        return Promise.resolve();
    };

    // 验证金额
    const validateAmount = (_: any, value: number) => {
        if (!value || value <= 0) {
            return Promise.reject(new Error('请输入有效的金额'));
        }
        return Promise.resolve();
    };

    function renderAccountItem(acc: IEthAccountItem) {
        return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                    <span>{acc.name}</span>
                    {acc.network && (
                        <Tag color="blue" style={{ margin: 0 }}>
                            {acc.network}{acc.chain_id ? `(${acc.chain_id})` : ''}
                        </Tag>
                    )}
                </Space>
                <span style={{ color: '#999', fontSize: '12px' }}>
                    {shortenAddress(acc.address)}
                </span>
            </div>
        )
    }

    const accountOptions = useMemo(() => {
        return accountList.map(acc => ({
            value: acc.address,
            label: renderAccountItem(acc),
            // 用于搜索的文本
            searchLabel: `${acc.name} ${acc.address} ${acc.network || ''}`,
        }));
    }, [accountList]);

    return (
        <div className={transactionSendStyles.transactionSend}>
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <Card size="small" title="发送交易" className={transactionSendStyles.sendCard}>
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={(values) => handleSend(values)}
                            // onValuesChange={handleFormChange}
                            initialValues={{
                                gasPrice: parseInt(gasPrice.data?.toString() || '0'),
                                gasLimit: '21000',
                                amountUnit: 'eth',
                            }}
                        >
                            <Form.Item label="接收地址">
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Segmented
                                        value={addressInputMode}
                                        onChange={(value) => {
                                            setAddressInputMode(value as 'manual' | 'select');
                                            // 切换模式时清空地址
                                            form.setFieldsValue({ to: '' });
                                        }}
                                        options={[
                                            {
                                                label: '手动输入',
                                                value: 'manual',
                                                icon: <EditOutlined />,
                                            },
                                            {
                                                label: '选择账户',
                                                value: 'select',
                                                icon: <UnorderedListOutlined />,
                                            },
                                        ]}
                                        block
                                    />
                                    
                                    {addressInputMode === 'manual' ? (
                                        <Form.Item
                                            name="to"
                                            rules={[{ validator: validateAddress }]}
                                            noStyle
                                        >
                                            <Input
                                                placeholder="请输入接收地址 (0x...)"
                                                prefix={<WalletOutlined />}
                                                className={transactionSendStyles.addressInput}
                                            />
                                        </Form.Item>
                                    ) : (
                                        <Space.Compact style={{ width: '100%' }}>
                                            <Form.Item
                                                name="to"
                                                rules={[{ validator: validateAddress }]}
                                                noStyle
                                            >
                                                <Select
                                                    placeholder="请选择接收账户"
                                                    loading={accountsLoading}
                                                    showSearch
                                                    optionFilterProp="label"
                                                    style={{ width: '100%' }}
                                                    options={accountOptions}
                                                    filterOption={(input, option) => {
                                                        const searchLabel = (option as any)?.searchLabel || '';
                                                        return searchLabel.toLowerCase().includes(input.toLowerCase());
                                                    }}
                                                    notFoundContent={
                                                        accountsLoading ? <Spin size="small" /> : '暂无账户'
                                                    }
                                                    suffixIcon={<WalletOutlined />}
                                                />
                                            </Form.Item>
                                            <Checkbox
                                                checked={onlyMyAccounts}
                                                onChange={(e) => setOnlyMyAccounts(e.target.checked)}
                                                className={transactionSendStyles.addressBelongTo}
                                            >
                                                仅我的
                                            </Checkbox>
                                            <Button
                                                icon={<ReloadOutlined />}
                                                onClick={() => loadAccounts()}
                                                loading={accountsLoading}
                                                style={{ borderLeft: 'none' }}
                                            />
                                        </Space.Compact>
                                    )}
                                </Space>
                            </Form.Item>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        label={`金额 (${sendAmountUnit})`}
                                        name="amount"
                                        rules={[{ validator: validateAmount }]}
                                    >
                                        <Space.Compact style={{ width: '100%' }}>  
                                            <Form.Item noStyle name="amount">
                                                <InputNumber
                                                    placeholder="0.0"
                                                    // precision={6}
                                                    min={0}
                                                    style={{ width: '100%' }}
                                                />
                                            </Form.Item>
                                            <Form.Item noStyle name="amountUnit">
                                                <Select
                                                    style={{ width: 80 }}
                                                    onChange={(value) => setSendAmountUnit(value as 'wei' | 'eth' | 'gwei')}
                                                    options={[
                                                        { label: 'ETH', value: 'eth' },
                                                        { label: 'Gwei', value: 'gwei' },
                                                        { label: 'wei', value: 'wei' },
                                                    ]}
                                                />
                                            </Form.Item>
                                        </Space.Compact>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label={<>
                                        <span>金额 (USD) (1 ETH = {eth2usd} USD) </span>
                                        <Button type="link" size="small" onClick={fetchMarketValue} icon={<ReloadOutlined />} style={{ fontSize: 16, height: 16 }}/>
                                        </>}>
                                        <Space.Compact style={{ width: '100%' }}>
                                            
                                            <Input readOnly value={calculateUsdAmount()} />
                                            <Space.Addon>USD</Space.Addon>
                                        </Space.Compact>
                                    </Form.Item>
                                </Col>
                            </Row>
                            

                            <Divider orientation="left" plain>
                                <Space>
                                    <SettingOutlined />
                                    <span>Gas 设置</span>
                                </Space>
                            </Divider>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        label="Gas Price (wei)"
                                        name="gasPrice"
                                        rules={[{ required: true, message: '请选择 Gas Price' }]}
                                    >
                                        <Space.Compact block style={{ width: '100%' }}>
                                            <Form.Item noStyle name="gasPrice">
                                                <InputNumber
                                                    style={{ width: '100%' }}
                                                    placeholder="0.0"
                                                    min={0}
                                                />
                                            </Form.Item>
                                            <Dropdown.Button style={{ width: 95 }} menu={{
                                                items: [
                                                    { key: 'fast2', label: '极速', onClick: () => setGasPrice('fast2') },
                                                    { key: 'fast1', label: '快速', onClick: () => setGasPrice('fast1') },
                                                    { key: 'slow',label: '慢速', onClick: () => setGasPrice('slow') },
                                                ],
                                            }} onClick={() => setGasPrice('standard')}>标准</Dropdown.Button>
                                        </Space.Compact>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Gas Limit"
                                        name="gasLimit"
                                        rules={[{ required: true, message: '请输入 Gas Limit' }]}
                                    >
                                        <Space.Compact style={{ width: '100%' }}>
                                            <Form.Item noStyle name="gasLimit">
                                                <InputNumber
                                                    // placeholder="21000"
                                                    // min={21000}
                                                    // max={1000000}
                                                    style={{ width: '100%' }}
                                                />
                                            </Form.Item>
                                            <Button 
                                                type="default" 
                                                onClick={() => setGasLimitByLevel('default')}
                                            >
                                                默认
                                            </Button>
                                        </Space.Compact>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                label="附加数据 (可选)"
                                name="data"
                            >
                                <Input.TextArea
                                    placeholder="0x..."
                                    rows={3}
                                    className={transactionSendStyles.dataInput}
                                />
                            </Form.Item>

                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={loading}
                                    icon={<SendOutlined />}
                                    size="large"
                                    block
                                    className={transactionSendStyles.sendButton}
                                >
                                    {loading ? '发送中...' : '发送交易'}
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <TransactionPreview txData={txData} eth2usd={eth2usd} />
                </Col>
            </Row>
        </div>
    );
}


interface TransactionPreviewProps {
    txData: TxData;
    eth2usd: string;
}


function TransactionPreview({ txData, eth2usd }: TransactionPreviewProps) {

    // const { accountInfo } = useWalletContext();
    const chainId = useChainId();
    const { address } = useConnection();
    const balance = useBalance({ address: address });
    // const gasEstimate = useEstimateGas({ 
    //     to: txData.to as `0x${string}`,
    //     chainId: chainId,
    //     value: txData.amount,
    // });
    // const gasPrice = useEstimateFeesPerGas({
    //     chainId: chainId,
    // });

    // 计算交易费用
    const calculateFee = useMemo(() => {

        let safeGasPrice = txData.gasPrice || BigInt(0);
        let safeGasLimit = txData.gasLimit || BigInt(0);
        

        return BigInt(safeGasPrice) * BigInt(safeGasLimit);


    }, [txData?.gasPrice, txData?.gasLimit]);

    const totalAmount = useMemo(() => {
        if (!txData?.amount || !calculateFee) {
            return null;
        }

        return (txData.amount + BigInt(calculateFee));
    }, [txData?.amount, calculateFee]);

    const showNotEnoughBalance = useMemo(() => {
        if (!totalAmount || !balance.data?.value || !calculateFee) {
            return false; // 无法判断，不显示
        }
        return totalAmount > balance.data?.value;
    }, [totalAmount, balance.data?.value, calculateFee]);

    return (
        <Card size="small" title="交易预览" className={transactionSendStyles.previewCard}>
            <div className={transactionSendStyles.previewContent}>
                <div className={transactionSendStyles.previewItem}>
                    <span className={transactionSendStyles.previewLabel}>接收地址:</span>
                    <span className={transactionSendStyles.previewValue}>
                        {txData?.to || '未设置'}
                    </span>
                </div>
                
                <div className={transactionSendStyles.previewItem}>
                    <span className={transactionSendStyles.previewLabel}>发送金额:</span>
                    <span className={transactionSendStyles.previewValue}>
                        {readableAmount(txData?.amount.toString())}
                    </span>
                </div>
                
                <div className={transactionSendStyles.previewItem}>
                    <span className={transactionSendStyles.previewLabel}>Gas Price:</span>
                    <span className={transactionSendStyles.previewValue}>
                        {txData?.gasPrice ? 
                            readableAmount(txData.gasPrice.toString()) : 
                            '未设置'
                        }
                    </span>
                </div>
                
                <div className={transactionSendStyles.previewItem}>
                    <span className={transactionSendStyles.previewLabel}>Gas Limit:</span>
                    <span className={transactionSendStyles.previewValue}>
                        {txData?.gasLimit?.toString() || '未设置'}
                    </span>
                </div>
                
                {/* <Divider /> */}
                
                <div className={transactionSendStyles.previewItem}>
                    <span className={transactionSendStyles.previewLabel}>交易费用:</span>
                    <span className={transactionSendStyles.previewValue}>
                        {calculateFee ? readableAmount(calculateFee.toString()) : '--'}, {wei2usd(calculateFee?.toString() || '0', eth2usd)} USD
                    </span>
                </div>
                
                <div className={transactionSendStyles.previewItem}>
                    <span className={transactionSendStyles.previewLabel}>总金额:</span>
                    <span className={transactionSendStyles.previewValue}>
                        {totalAmount ? readableAmount(totalAmount.toString()) : '--'}, {wei2usd(totalAmount?.toString() || '0', eth2usd)} USD
                    </span>
                </div>
            </div>

            {showNotEnoughBalance ? (
                <Alert
                    message="余额不足"
                        description="本账户没有足够的 ETH 余额支付交易费用。交易一旦发送无法撤销。"
                        type="error"
                        showIcon
                        className={transactionSendStyles.warningAlert}
                    />
                ) 
            : null}
        </Card>
    )
}