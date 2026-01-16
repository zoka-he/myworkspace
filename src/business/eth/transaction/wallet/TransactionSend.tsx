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

interface WalletActionsProps {
    // walletInfo?: IWalletInfo | null;
}

// 付款表单数据类型
interface SendFormData {
    to: string;
    amount: bigint;
    gasPrice: bigint;
    gasLimit: bigint;
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

export default function TransactionSend(props: WalletActionsProps) {
    const { isWalletConnected, networkInfo, accountInfo, getWalletTool } = useWalletContext();

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
        if (!networkInfo?.chainId) {
            return;
        }

        const chainId = parseInt(networkInfo?.chainId?.toString() || '0');
        if (chainId === 0) {
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
        let amount: bigint = BigInt(0);
        switch (sendAmountUnit) {
            case 'wei':
                amount = BigInt(formValues.amount.toString().split('.')[0] || '0');
                break;
            case 'eth':
                amount = eth2wei(formValues?.amount?.toString() || '0');
                break;
            case 'gwei':
                amount = gwei2wei(formValues?.amount?.toString() || '0'  );
        }

        return {
            ...formValues,
            amount,
        }
    }, [formValues, sendAmountUnit])

    // 加载账户列表
    const loadAccounts = async () => {
        setAccountsLoading(true);
        try {
            let params: any = {
                page: 1,
                limit: 100
            };

            if (networkInfo?.chainId) {
                params.chain_id = parseInt(networkInfo.chainId).toString();
            }

            // @ts-ignore
            const { data } = await fetch.get('/api/eth/account', { params: params });
            let validReceivers = data.filter((item: any) => {
                // 基础过滤：排除当前地址
                const isNotCurrentAddress = item.address.toLowerCase() !== accountInfo?.selectedAddress.toLowerCase();
                const hasPrivateKey = item.private_key !== null && item.private_key !== '';
                
                // 网络匹配
                let networkMatch = false;
                if (accountInfo?.custom) {
                    networkMatch = item.network_id === networkInfo?.networkId;
                } else {
                    networkMatch = item.chain_id === Number(networkInfo?.chainId);
                }
                
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
    }, [addressInputMode, accountInfo, onlyMyAccounts]);

    // 计算交易费用
    const calculateFee = (gasPrice: number, gasLimit: number) => {
        const fee = (gasPrice * gasLimit) / 1e18;
        return readableAmount(fee.toString(), 'eth');
    };

    // 缩短地址显示
    const shortenAddress = (address: string) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // 显示二次确认对话框
    const showConfirmModal = (values: SendFormData) => {
        const estimatedFee = BigInt(values.gasPrice) * BigInt(values.gasLimit);
        const totalAmount = values.amount + estimatedFee;
        
        Modal.confirm({
            title: '确认发送交易',
            icon: <ExclamationCircleOutlined />,
            content: (
                <div style={{ marginTop: 16 }}>
                    <Descriptions column={1} size="small" bordered>
                        <Descriptions.Item label="接收地址">
                            <div style={{ wordBreak: 'break-all' }}>{values.to}</div>
                        </Descriptions.Item>
                        <Descriptions.Item label="发送金额">
                            <span style={{ fontSize: 16, fontWeight: 'bold', color: '#ff4d4f' }}>
                                {readableAmount(values.amount.toString())}
                            </span>
                        </Descriptions.Item>
                        <Descriptions.Item label="Gas Price">
                            {readableAmount(values.gasPrice.toString())}
                        </Descriptions.Item>
                        <Descriptions.Item label="Gas Limit">
                            {readableAmount(values.gasLimit.toString())}
                        </Descriptions.Item>
                        <Descriptions.Item label="预估费用">
                            {readableAmount(estimatedFee.toString())}
                        </Descriptions.Item>
                        <Descriptions.Item label="总计">
                            <span style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>
                                {readableAmount(totalAmount.toString())}
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
                await sendTransaction(values);
            },
        });
    };

    // 发送交易
    const sendTransaction = async (values: SendFormData) => {
        try {
            setLoading(true);
            
            // 检查是否有钱包连接
            if (!isWalletConnected) {
                message.error('请先连接钱包');
                return;
            }

            let fromAddress = accountInfo?.selectedAddress;

            message.loading({ content: '正在发送交易...', key: 'sendTx', duration: 0 });

            let txHash = await getWalletTool()?.sendTransaction({
                from: fromAddress,
                to: values.to,
                value: values.amount.toString(16),
                gas: values.gasLimit.toString(16),
                gasPrice: values.gasPrice.toString(16),
                data: (values.data || '').trim(),
            })

            if (!txHash) {
                message.error('发送交易失败');
                return;
            }
            
            message.loading({ 
                content: `交易已发送，等待确认... (Hash: ${txHash.slice(0, 10)}...)`, 
                key: 'sendTx',
                duration: 0 
            });

            const sleep = (seconds: number) => {
                return new Promise(resolve => setTimeout(resolve, seconds * 1000));
            }

            let receipt: any = null;
            for (let i = 60; i > 0; i-=2) {
                await sleep(2);
                receipt = await getWalletTool()?.waitForTransactionReceipt(txHash);
                if (receipt) {
                    break;
                }
            }

            if (!receipt) {
                message.error({ content: '交易超时', key: 'sendTx', duration: 5 });
                return;
            } else if (parseInt(receipt?.status) === 1) {
                message.success({ 
                    content: `交易成功! Hash: ${txHash}`,
                    key: 'sendTx',
                    duration: 5,
                });
                
                // 复制交易哈希到剪贴板
                copyToClip(txHash);
                message.info('交易哈希已复制到剪贴板');
                
                // 重置表单
                form.resetFields();
                // setEstimatedFee('0.001');
            } else {
                throw new Error('交易失败');
            }
            
        } catch (error: any) {
            console.error('交易发送失败:', error);
            
            // 处理用户拒绝交易
            if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
                message.warning({ content: '您已取消交易', key: 'sendTx' });
            } else if (error.code === 'INSUFFICIENT_FUNDS') {
                message.error({ content: '余额不足', key: 'sendTx' });
            } else {
                message.error({ 
                    content: `交易失败: ${error.message || '未知错误'}`,
                    key: 'sendTx',
                    duration: 5,
                });
            }
        } finally {
            setLoading(false);
        }
    };

    // 处理表单提交（显示确认对话框）
    const handleSend = async (values: SendFormData) => {
        showConfirmModal(values);
    };

    // 设置最大 Gas
    const setMaxGas = () => {
        form.setFieldsValue({ gasLimit: BigInt(21000) });
        // handleFormChange();
    };

    const setGasPrice = (gasPrice: number | string) => {
        let result: number = 0;

        let gasPrice_standard = parseInt(networkInfo?.gasPrice) || null; 
        if (gasPrice_standard === null || gasPrice_standard === undefined || gasPrice_standard === 0) {
            if (typeof gasPrice === 'number') {
                result = gasPrice;
            } else if (typeof gasPrice === 'string' && _.isNumber(gasPrice)) {
                result = Number(gasPrice);
            }
        } else {
            if (gasPrice === 'fast2') {
                result = gasPrice_standard * 2;
            } else if (gasPrice === 'fast1') {
                result = gasPrice_standard * 1.5;
            } else if (gasPrice === 'slow') {
                result = gasPrice_standard * 0.8;
            } else if (gasPrice === 'standard') {
                result = gasPrice_standard;
            } else if (typeof gasPrice === 'number') {
                result = gasPrice;
            } else if (typeof gasPrice === 'string' && _.isNumber(gasPrice)) {
                result = Number(gasPrice);
            }
        }

        form.setFieldValue('gasPrice', Math.round(result));
        
    };

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
                            onFinish={() => handleSend(txData)}
                            // onValuesChange={handleFormChange}
                            initialValues={{
                                gasPrice: networkInfo?.gasPrice ? gwei2wei(networkInfo?.gasPrice) : null,
                                gasLimit: 21000,
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
                                            <Select
                                                value={sendAmountUnit}
                                                style={{ width: 80 }}
                                                onChange={(value) => setSendAmountUnit(value as 'wei' | 'eth' | 'gwei')}
                                                options={[
                                                    { label: 'ETH', value: 'eth' },
                                                    { label: 'Gwei', value: 'gwei' },
                                                    { label: 'wei', value: 'wei' },
                                                ]}
                                            />
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
                                                    placeholder="21000"
                                                    min={21000}
                                                    max={1000000}
                                                    style={{ width: '100%' }}
                                                />
                                            </Form.Item>
                                            <Button 
                                                type="default" 
                                                onClick={setMaxGas}
                                            >
                                                最大
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
    txData: SendFormData;
    eth2usd: string;
}


function TransactionPreview({ txData, eth2usd }: TransactionPreviewProps) {

    const { accountInfo } = useWalletContext();

    // 计算交易费用
    const calculateFee = useMemo(() => {

        if (!txData?.gasPrice || !txData?.gasLimit) {
            return null;
        }

        let safeGasPrice: number | bigint | string = txData.gasPrice;
        let safeGasLimit: number | bigint | string = txData.gasLimit;
        if (typeof safeGasPrice === 'string') {
            safeGasPrice = Number(safeGasPrice);
        }

        if (typeof safeGasLimit === 'string') {
            safeGasLimit = Number(safeGasLimit);
        }

        if (typeof safeGasPrice === 'number') {
            safeGasPrice = BigInt(Math.round(safeGasPrice));
        }

        if (typeof safeGasLimit === 'number') {
            safeGasLimit = BigInt(Math.round(safeGasLimit));
        }

        return safeGasPrice * safeGasLimit;
    }, [txData?.gasPrice, txData?.gasLimit]);

    const totalAmount = useMemo(() => {
        if (!txData?.amount || calculateFee === null) {
            return null;
        }

        return (txData.amount + BigInt(calculateFee));
    }, [txData?.amount, calculateFee]);

    const showNotEnoughBalance = useMemo(() => {
        if (!totalAmount || !accountInfo?.balance || calculateFee === null) {
            return false; // 无法判断，不显示
        }
        return totalAmount > accountInfo.balance;
    }, [totalAmount, accountInfo?.balance]);

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