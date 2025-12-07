import copyToClip from '@/src/utils/common/copy';
import { Form, message, Modal, Descriptions, Alert, Row, Col, Card, Space, Segmented, Input, Select, Tag, Spin, Checkbox, Button, InputNumber, Divider } from 'antd';
import { ethers } from 'ethers';
import { useState, useEffect } from 'react';
import { IWalletInfo } from '../IWalletInfo';
import { SendOutlined, WalletOutlined, SettingOutlined, ReloadOutlined, ExclamationCircleOutlined, EditOutlined, UnorderedListOutlined } from "@ant-design/icons";
import transactionHistoryStyles from './TransactionHistory.module.scss';
import fetch from '@/src/fetch';

interface WalletActionsProps {
    walletInfo?: IWalletInfo | null;
}

// 付款表单数据类型
interface SendFormData {
    to: string;
    amount: number;
    gasPrice: number;
    gasLimit: number;
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

export default function TransactionSend(props: WalletActionsProps) {
    const [form] = Form.useForm<SendFormData>();
    const [loading, setLoading] = useState(false);
    // const [estimatedGas, setEstimatedGas] = useState<string>('21000');
    const [estimatedFee, setEstimatedFee] = useState<string>('0.001');
    const [gasPriceOptions] = useState([
        { label: '慢速 (20 Gwei)', value: 20000000000 },
        { label: '标准 (30 Gwei)', value: 30000000000 },
        { label: '快速 (50 Gwei)', value: 50000000000 },
        { label: '极速 (100 Gwei)', value: 100000000000 },
    ]);
    
    // 接收地址输入模式：manual-手动输入, select-选择账户
    const [addressInputMode, setAddressInputMode] = useState<'manual' | 'select'>('select');
    const [accountList, setAccountList] = useState<IEthAccountItem[]>([]);
    const [accountsLoading, setAccountsLoading] = useState(false);
    const [onlyMyAccounts, setOnlyMyAccounts] = useState(true); // 是否仅显示我的账户

    // 加载账户列表
    const loadAccounts = async () => {
        setAccountsLoading(true);
        try {
            let params: any = {
                page: 1,
                limit: 100
            };

            if (props.walletInfo?.networkId) {
                params.network_id = props.walletInfo.networkId;
            }

            // @ts-ignore
            const { data } = await fetch.get('/api/eth/account', { params: params });
            let validReceivers = data.filter((item: any) => {
                // 基础过滤：排除当前地址
                const isNotCurrentAddress = item.address.toLowerCase() !== props.walletInfo?.address.toLowerCase();
                const hasPrivateKey = item.private_key !== null && item.private_key !== '';
                
                // 网络匹配
                let networkMatch = false;
                if (props.walletInfo?.custom) {
                    networkMatch = item.network_id === props.walletInfo?.networkId;
                } else {
                    networkMatch = item.chain_id === Number(props.walletInfo?.networkInfo?.chainId);
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
    }, [addressInputMode, props.walletInfo, onlyMyAccounts]);

    // 计算交易费用
    const calculateFee = (gasPrice: number, gasLimit: number) => {
        const fee = (gasPrice * gasLimit) / 1e18;
        return fee.toFixed(6);
    };

    // 监听表单变化，更新费用估算
    const handleFormChange = () => {
        const values = form.getFieldsValue();
        if (values.gasPrice && values.gasLimit) {
            const fee = calculateFee(values.gasPrice, values.gasLimit);
            setEstimatedFee(fee);
        }
    };

    // 缩短地址显示
    const shortenAddress = (address: string) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // 显示二次确认对话框
    const showConfirmModal = (values: SendFormData) => {
        const totalAmount = parseFloat(values.amount.toString()) + parseFloat(estimatedFee);
        
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
                                {values.amount} ETH
                            </span>
                        </Descriptions.Item>
                        <Descriptions.Item label="Gas Price">
                            {(values.gasPrice / 1e9).toFixed(0)} Gwei
                        </Descriptions.Item>
                        <Descriptions.Item label="Gas Limit">
                            {values.gasLimit}
                        </Descriptions.Item>
                        <Descriptions.Item label="预估费用">
                            {estimatedFee} ETH
                        </Descriptions.Item>
                        <Descriptions.Item label="总计">
                            <span style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>
                                {totalAmount.toFixed(6)} ETH
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
            if (!props.walletInfo) {
                message.error('请先连接钱包');
                return;
            }

            let provider: ethers.JsonRpcProvider | ethers.BrowserProvider;
            let signer: ethers.Wallet | ethers.JsonRpcSigner;

            // 判断是否为自定义钱包
            if (props.walletInfo.custom) {
                // 使用自定义钱包（privateKey + rpcUrl）
                if (!props.walletInfo.rpcUrl) {
                    message.error('缺少 RPC URL 配置');
                    return;
                }
                
                if (!props.walletInfo.privateKey) {
                    message.error('缺少私钥信息');
                    return;
                }

                // 创建 provider 和 wallet
                provider = new ethers.JsonRpcProvider(props.walletInfo.rpcUrl);
                signer = new ethers.Wallet(props.walletInfo.privateKey, provider);
                
                // 验证地址匹配
                const walletAddress = await signer.getAddress();
                if (walletAddress.toLowerCase() !== props.walletInfo.address.toLowerCase()) {
                    message.error('私钥与地址不匹配');
                    return;
                }
            } else {
                // 使用 MetaMask 钱包
                if (typeof window === 'undefined' || !window.ethereum) {
                    message.error('未检测到钱包，请安装 MetaMask');
                    return;
                }

                provider = new ethers.BrowserProvider(window.ethereum);
                signer = await provider.getSigner();
                
                // 验证当前账户
                const currentAddress = await signer.getAddress();
                if (currentAddress.toLowerCase() !== props.walletInfo.address.toLowerCase()) {
                    message.error('钱包地址不匹配，请检查连接状态');
                    return;
                }
            }

            // 获取当前地址
            const currentAddress = await signer.getAddress();

            // 检查余额是否充足
            const balance = await provider.getBalance(currentAddress);
            const totalAmount = ethers.parseEther(values.amount.toString()) + 
                               BigInt(values.gasPrice) * BigInt(values.gasLimit);
            
            if (balance < totalAmount) {
                message.error('余额不足，无法完成交易');
                return;
            }

            // 构建交易
            const transaction: ethers.TransactionRequest = {
                to: values.to,
                value: ethers.parseEther(values.amount.toString()),
                gasLimit: values.gasLimit,
                gasPrice: values.gasPrice,
            };

            // 如果有附加数据
            if (values.data && values.data.trim() !== '') {
                transaction.data = values.data.trim();
            }

            message.loading({ content: '正在发送交易...', key: 'sendTx', duration: 0 });

            // 发送交易
            const txResponse = await signer.sendTransaction(transaction);
            
            message.loading({ 
                content: `交易已发送，等待确认... (Hash: ${txResponse.hash.slice(0, 10)}...)`, 
                key: 'sendTx',
                duration: 0 
            });

            // 等待交易确认
            const receipt = await txResponse.wait();
            
            if (receipt?.status === 1) {
                message.success({ 
                    content: `交易成功! Hash: ${txResponse.hash}`,
                    key: 'sendTx',
                    duration: 5,
                });
                
                // 复制交易哈希到剪贴板
                copyToClip(txResponse.hash);
                message.info('交易哈希已复制到剪贴板');
                
                // 重置表单
                form.resetFields();
                setEstimatedFee('0.001');
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
        form.setFieldsValue({ gasLimit: 21000 });
        handleFormChange();
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
        if (value > 1000) {
            return Promise.reject(new Error('金额不能超过 1000 ETH'));
        }
        return Promise.resolve();
    };

    return (
        <div className={transactionHistoryStyles.transactionSend}>
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <Card size="small" title="发送交易" className={transactionHistoryStyles.sendCard}>
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleSend}
                            onValuesChange={handleFormChange}
                            initialValues={{
                                gasPrice: 30000000000,
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
                                                className={transactionHistoryStyles.addressInput}
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
                                                    options={accountList.map(acc => ({
                                                        value: acc.address,
                                                        label: (
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
                                                        ),
                                                        // 用于搜索的文本
                                                        searchLabel: `${acc.name} ${acc.address} ${acc.network || ''}`,
                                                    }))}
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
                                                style={{ 
                                                    padding: '0 11px',
                                                    border: '1px solid #d9d9d9',
                                                    borderLeft: 'none',
                                                    height: '32px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    whiteSpace: 'nowrap'
                                                }}
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

                            <Form.Item
                                label="金额 (ETH)"
                                name="amount"
                                rules={[{ validator: validateAmount }]}
                            >
                                <InputNumber
                                    placeholder="0.0"
                                    min={0}
                                    max={1000}
                                    precision={6}
                                    style={{ width: '100%' }}
                                    addonAfter="ETH"
                                />
                            </Form.Item>

                            <Divider orientation="left" plain>
                                <Space>
                                    <SettingOutlined />
                                    <span>Gas 设置</span>
                                </Space>
                            </Divider>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        label="Gas Price (Gwei)"
                                        name="gasPrice"
                                        rules={[{ required: true, message: '请选择 Gas Price' }]}
                                    >
                                        <Select
                                            placeholder="选择 Gas Price"
                                            options={gasPriceOptions}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Gas Limit"
                                        name="gasLimit"
                                        rules={[{ required: true, message: '请输入 Gas Limit' }]}
                                    >
                                        <InputNumber
                                            placeholder="21000"
                                            min={21000}
                                            max={1000000}
                                            style={{ width: '100%' }}
                                            addonAfter={
                                                <Button 
                                                    type="link" 
                                                    size="small" 
                                                    onClick={setMaxGas}
                                                >
                                                    最大
                                                </Button>
                                            }
                                        />
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
                                    className={transactionHistoryStyles.dataInput}
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
                                    className={transactionHistoryStyles.sendButton}
                                >
                                    {loading ? '发送中...' : '发送交易'}
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <Card size="small" title="交易预览" className={transactionHistoryStyles.previewCard}>
                        <div className={transactionHistoryStyles.previewContent}>
                            <div className={transactionHistoryStyles.previewItem}>
                                <span className={transactionHistoryStyles.previewLabel}>接收地址:</span>
                                <span className={transactionHistoryStyles.previewValue}>
                                    {form.getFieldValue('to') || '未设置'}
                                </span>
                            </div>
                            
                            <div className={transactionHistoryStyles.previewItem}>
                                <span className={transactionHistoryStyles.previewLabel}>发送金额:</span>
                                <span className={transactionHistoryStyles.previewValue}>
                                    {form.getFieldValue('amount') || '0'} ETH
                                </span>
                            </div>
                            
                            <div className={transactionHistoryStyles.previewItem}>
                                <span className={transactionHistoryStyles.previewLabel}>Gas Price:</span>
                                <span className={transactionHistoryStyles.previewValue}>
                                    {form.getFieldValue('gasPrice') ? 
                                        `${(form.getFieldValue('gasPrice') / 1e9).toFixed(0)} Gwei` : 
                                        '未设置'
                                    }
                                </span>
                            </div>
                            
                            <div className={transactionHistoryStyles.previewItem}>
                                <span className={transactionHistoryStyles.previewLabel}>Gas Limit:</span>
                                <span className={transactionHistoryStyles.previewValue}>
                                    {form.getFieldValue('gasLimit') || '未设置'}
                                </span>
                            </div>
                            
                            <Divider />
                            
                            <div className={transactionHistoryStyles.previewItem}>
                                <span className={transactionHistoryStyles.previewLabel}>预估费用:</span>
                                <span className={transactionHistoryStyles.previewValue}>
                                    {estimatedFee} ETH
                                </span>
                            </div>
                            
                            <div className={transactionHistoryStyles.previewItem}>
                                <span className={transactionHistoryStyles.previewLabel}>总金额:</span>
                                <span className={transactionHistoryStyles.previewValue}>
                                    {form.getFieldValue('amount') ? 
                                        `${(parseFloat(form.getFieldValue('amount')) + parseFloat(estimatedFee)).toFixed(6)} ETH` : 
                                        '0 ETH'
                                    }
                                </span>
                            </div>
                        </div>

                        <Alert
                            message="注意事项"
                            description="请确保账户有足够的 ETH 余额支付交易费用。交易一旦发送无法撤销。"
                            type="warning"
                            showIcon
                            className={transactionHistoryStyles.warningAlert}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}