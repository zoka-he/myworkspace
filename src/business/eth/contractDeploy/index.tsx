import { useState, useEffect, useCallback } from 'react';
import fetch from '@/src/fetch';
import { 
    Button, Input, Space, Table, message, Tag, Modal, Form, 
    Select, Card, Row, Col, Statistic, Upload, Tabs, Collapse,
    Typography, Spin, Tooltip, Badge, Switch, Alert
} from 'antd';
import { 
    ExclamationCircleFilled, CopyOutlined, PlusOutlined, 
    EditOutlined, DeleteOutlined, EyeOutlined, RocketOutlined,
    FileTextOutlined, CloudUploadOutlined, CodeOutlined,
    CheckCircleOutlined, SyncOutlined, InteractionOutlined,
    WalletOutlined, LinkOutlined, HistoryOutlined
} from '@ant-design/icons';
import { ethers } from 'ethers';
import confirm from "antd/es/modal/confirm";
import { IEthAccount } from '../../../types/IEthAccount';
import QueryBar from '@/src/components/queryBar';
import usePagination from '@/src/utils/hooks/usePagination';
import copyToClip from '@/src/utils/common/copy';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import { IContract, IContractMethod } from '../../../types/IContract';

const { Column } = Table;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Title, Text, Paragraph } = Typography;

export default function ContractDeploy() {
    const [userParams, setUserParams] = useState({});
    const [listData, updateListData] = useState<IContract[]>([]);
    const [accountList, setAccountList] = useState<IEthAccount[]>([]);
    const [spinning, updateSpinning] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [isInteractModalVisible, setIsInteractModalVisible] = useState(false);
    const [editingContract, setEditingContract] = useState<IContract | null>(null);
    const [currentContract, setCurrentContract] = useState<IContract | null>(null);
    const [form] = Form.useForm();
    const [interactForm] = Form.useForm();
    const pagination = usePagination();

    // 部署相关状态
    const [solCode, setSolCode] = useState(''); // sol 文件变为可选
    const [deploying, setDeploying] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<IEthAccount | null>(null);
    const [constructorParams, setConstructorParams] = useState<any[]>([]);
    const [manualAbi, setManualAbi] = useState('');
    const [manualBytecode, setManualBytecode] = useState('');

    useEffect(() => {
        onQuery();
        loadAccounts();
    }, []);

    useEffect(() => {
        onQuery();
    }, [userParams, pagination.page, pagination.pageSize]);

    async function loadAccounts() {
        try {
            // @ts-ignore
            const { data } = await fetch.get('/api/eth/account', { 
                params: { page: 1, limit: 100 } 
            });
            setAccountList(data || []);
        } catch (e: any) {
            console.error('加载账户列表失败:', e);
            message.error('加载账户列表失败');
        }
    }

    async function onQuery() {
        try {
            updateSpinning(true);

            const params: any = {
                ...userParams,
                page: pagination.page,
                limit: pagination.pageSize
            }

            // @ts-ignore
            const { data, count } = await fetch.get('/api/eth/contract', { params })

            updateListData(data || []);
            pagination.setTotal(count || 0);
        } catch (e: any) {
            console.error(e);
            message.error(e.message || '查询失败');
        } finally {
            updateSpinning(false);
        }
    }

    // 从 ABI 解析构造函数参数
    const parseConstructorParams = useCallback((abi: string) => {
        try {
            const abiArray = JSON.parse(abi);
            const constructor = abiArray.find((item: any) => item.type === 'constructor');
            if (constructor && constructor.inputs) {
                setConstructorParams(constructor.inputs);
            } else {
                setConstructorParams([]);
            }
        } catch (e) {
            console.error('解析构造函数参数失败:', e);
            setConstructorParams([]);
        }
    }, []);

    // 暂存合约（不实际部署）
    const saveAsDraft = useCallback(async () => {
        try {
            const values = await form.validateFields(['contractName']);
            
            // 检查是否至少有 ABI 或 Bytecode
            const hasManualAbi = manualAbi && manualAbi.trim().length > 0;
            const hasManualBytecode = manualBytecode && manualBytecode.trim().length > 0;

            if (!hasManualAbi && !hasManualBytecode) {
                message.error('请至少输入 ABI 或 Bytecode');
                return;
            }

            // 验证合约名称
            if (!values.contractName) {
                message.error('请输入合约名称');
                return;
            }

            setDeploying(true);

            // 准备保存的数据
            let abiToSave = '[]';
            let bytecodeToSave = '';

            if (hasManualAbi) {
                try {
                    JSON.parse(manualAbi); // 验证ABI格式
                    abiToSave = manualAbi;
                } catch (e) {
                    message.error('ABI格式不正确，请检查JSON格式');
                    setDeploying(false);
                    return;
                }
            }
            
            if (hasManualBytecode) {
                bytecodeToSave = manualBytecode;
            }

            // 保存合约信息到数据库，状态为未部署
            await fetch.post('/api/eth/contract', {
                name: values.contractName,
                abi: abiToSave,
                bytecode: bytecodeToSave,
                source_code: solCode || '', // sol 文件可选
                status: 'undeployed',
                remark: values.remark || ''
            });

            message.success('合约已暂存');
            setIsModalVisible(false);
            onQuery();
            
            // 重置表单
            form.resetFields();
            setSolCode('');
            setConstructorParams([]);
            setManualAbi('');
            setManualBytecode('');

        } catch (e: any) {
            console.error('暂存失败:', e);
            message.error('暂存失败: ' + e.message);
        } finally {
            setDeploying(false);
        }
    }, [form, solCode, manualAbi, manualBytecode, onQuery]);

    // 部署合约
    const deployContract = useCallback(async () => {
        if (!manualAbi || !manualBytecode) {
            message.error('请先输入 ABI 和 Bytecode');
            return;
        }

        if (!selectedAccount || !selectedAccount.private_key) {
            message.error('请选择有私钥的账户');
            return;
        }

        try {
            const values = await form.validateFields();
            setDeploying(true);

            // 验证 ABI 格式
            let abi;
            try {
                abi = JSON.parse(manualAbi);
            } catch (e) {
                message.error('ABI 格式不正确');
                setDeploying(false);
                return;
            }

            // 从账户获取网络信息
            // @ts-ignore
            const { data: networks } = await fetch.get('/api/eth/network', {
                params: { id: selectedAccount.network_id }
            });
            
            const network = networks?.[0];
            if (!network) {
                message.error('未找到网络信息');
                return;
            }

            // 创建provider和wallet
            const provider = new ethers.JsonRpcProvider(network.rpc_url);
            const wallet = new ethers.Wallet(selectedAccount.private_key, provider);

            // 准备构造函数参数
            const params = constructorParams.map((param: any) => {
                return values[`param_${param.name}`];
            });

            // 创建合约工厂
            const factory = new ethers.ContractFactory(
                abi,
                manualBytecode,
                wallet
            );

            // 部署合约
            message.loading({ content: '正在部署合约...', key: 'deploy' });
            const contract = await factory.deploy(...params);
            await contract.waitForDeployment();

            const contractAddress = await contract.getAddress();

            // 保存合约信息到数据库
            await fetch.post('/api/eth/contract', {
                name: values.contractName,
                address: contractAddress,
                deployer_address: selectedAccount.address,
                deployer_account_id: selectedAccount.id,
                network_id: selectedAccount.network_id,
                network: selectedAccount.network,
                chain_id: selectedAccount.chain_id,
                abi: manualAbi,
                bytecode: manualBytecode,
                source_code: solCode || '', // sol 文件可选
                constructor_params: JSON.stringify(params),
                status: 'deployed',
                remark: values.remark || ''
            });

            message.success({ content: '部署成功', key: 'deploy' });
            setIsModalVisible(false);
            onQuery();
            
            // 重置表单
            form.resetFields();
            setSolCode('');
            setConstructorParams([]);
            setManualAbi('');
            setManualBytecode('');

        } catch (e: any) {
            console.error('部署失败:', e);
            message.error({ content: '部署失败: ' + e.message, key: 'deploy' });
        } finally {
            setDeploying(false);
        }
    }, [manualAbi, manualBytecode, selectedAccount, form, constructorParams, solCode, onQuery]);

    function onCreateContract() {
        setEditingContract(null);
        form.resetFields();
        setSolCode('');
        setConstructorParams([]);
        setSelectedAccount(null);
        setManualAbi('');
        setManualBytecode('');
        setIsModalVisible(true);
    }

    function onViewContract(contract: IContract) {
        setCurrentContract(contract);
        setIsDetailModalVisible(true);
    }

    function onInteractContract(contract: IContract) {
        setCurrentContract(contract);
        interactForm.resetFields();
        setIsInteractModalVisible(true);
    }

    function onDeleteContract(contract: IContract) {
        confirm({
            title: '删除确认',
            icon: <ExclamationCircleFilled />,
            content: `确定要删除合约 "${contract.name}" 吗？`,
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            async onOk() {
                try {
                    await fetch.delete('/api/eth/contract', { 
                        params: { id: contract.id } 
                    });
                    message.success('删除成功');
                    onQuery();
                } catch (e: any) {
                    message.error(e.message || '删除失败');
                }
            },
        });
    }

    // 调用合约方法
    const callContractMethod = useCallback(async () => {
        if (!currentContract) return;

        if (!currentContract.address) {
            message.error('合约地址不存在，无法调用方法');
            return;
        }

        try {
            const values = await interactForm.validateFields();
            const methodName = values.method;
            
            if (!currentContract.abi) {
                message.error('合约ABI不存在，无法调用方法');
                return;
            }
            
            const abi = JSON.parse(currentContract.abi);
            const method = abi.find((item: any) => 
                item.type === 'function' && item.name === methodName
            );

            if (!method) {
                message.error('未找到方法');
                return;
            }

            // 获取网络信息
            // @ts-ignore
            const { data: networks } = await fetch.get('/api/eth/network', {
                params: { id: currentContract.network_id }
            });
            
            const network = networks?.[0];
            if (!network) {
                message.error('未找到网络信息');
                return;
            }

            const provider = new ethers.JsonRpcProvider(network.rpc_url);
            
            // 准备参数
            const params = method.inputs.map((input: any) => {
                return values[`param_${input.name}`];
            });

            if (method.stateMutability === 'view' || method.stateMutability === 'pure') {
                // 只读方法，不需要签名
                const contract = new ethers.Contract(currentContract.address, abi, provider);
                const result = await contract[methodName](...params);
                
                Modal.info({
                    title: '调用结果',
                    width: 600,
                    content: (
                        <div>
                            <Text strong>方法: </Text><Text>{methodName}</Text><br/>
                            <Text strong>返回值: </Text><Text code>{JSON.stringify(result, null, 2)}</Text>
                        </div>
                    )
                });
            } else {
                // 需要交易的方法
                const account = accountList.find(a => a.id === values.accountId);
                if (!account || !account.private_key) {
                    message.error('请选择有私钥的账户');
                    return;
                }

                const wallet = new ethers.Wallet(account.private_key, provider);
                const contract = new ethers.Contract(currentContract.address, abi, wallet);
                
                message.loading({ content: '正在发送交易...', key: 'call' });
                const tx = await contract[methodName](...params);
                await tx.wait();
                
                message.success({ 
                    content: `交易成功: ${tx.hash}`, 
                    key: 'call',
                    duration: 5
                });
            }

            setIsInteractModalVisible(false);
        } catch (e: any) {
            console.error('调用失败:', e);
            message.error('调用失败: ' + e.message);
        }
    }, [currentContract, interactForm, accountList]);

    // 编辑或部署未部署的合约
    const deployUndeployedContract = useCallback(async (contract: IContract) => {
        setCurrentContract(contract);
        
        // 加载合约信息
        setSolCode(contract.source_code || '');
        setManualAbi(contract.abi || '');
        setManualBytecode(contract.bytecode || '');
        
        // 如果有 ABI，解析构造函数参数
        if (contract.abi) {
            parseConstructorParams(contract.abi);
        } else {
            setConstructorParams([]);
        }
        
        form.setFieldsValue({
            contractName: contract.name,
            remark: contract.remark
        });

        setIsModalVisible(true);
    }, [form, parseConstructorParams]);

    function renderAction(cell: any, row: IContract) {
        if (row.status === 'undeployed') {
            // 未部署的合约
            return (
                <div className={styles.actionButtons}>
                    <Button 
                        size="small" 
                        type="primary" 
                        icon={<EditOutlined />} 
                        onClick={() => deployUndeployedContract(row)}
                    >
                        编辑
                    </Button>
                    <Button 
                        size="small" 
                        icon={<EyeOutlined />} 
                        onClick={() => onViewContract(row)}
                    >
                        详情
                    </Button>
                    <Button 
                        size="small" 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={() => onDeleteContract(row)}
                    >
                        删除
                    </Button>
                </div>
            );
        }

        // 已部署的合约显示交互按钮
        return (
            <div className={styles.actionButtons}>
                <Button 
                    size="small" 
                    type="primary" 
                    icon={<EyeOutlined />} 
                    onClick={() => onViewContract(row)}
                >
                    详情
                </Button>
                <Button 
                    size="small" 
                    icon={<InteractionOutlined />} 
                    onClick={() => onInteractContract(row)}
                >
                    交互
                </Button>
                <Button 
                    size="small" 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={() => onDeleteContract(row)}
                >
                    删除
                </Button>
            </div>
        )
    }

    function renderCopyableCell(cell: string) {

        if (typeof cell !== 'string' || !cell) {
            return <Text type="secondary">-</Text>;
        }
        
        return (
            <Space>
                <Button
                    size="small"
                    type="link"
                    icon={<CopyOutlined />}
                    className={styles.copyButton}
                    onClick={() => {
                        copyToClip(cell);
                        message.success('已复制');
                    }}
                >
                    {cell.substring(0, 8)}...{cell.substring(cell.length - 6)}
                </Button>
            </Space>
        );
    }

    function renderStatus(status: string, row?: IContract) {
        const statusConfig: any = {
            'undeployed': { color: 'default', icon: <FileTextOutlined />, text: '未部署' },
            'deployed': { color: 'success', icon: <CheckCircleOutlined />, text: '已部署' },
            'pending': { color: 'processing', icon: <SyncOutlined spin />, text: '部署中' },
            'failed': { color: 'error', icon: <ExclamationCircleFilled />, text: '部署失败' }
        };
        const config = statusConfig[status] || statusConfig.deployed;
        return <Tag icon={config.icon} color={config.color}>{config.text}</Tag>;
    }

    function renderNetwork(network: string, row: any) {
        if (!network || !row.chain_id) {
            return <Text type="secondary">-</Text>;
        }
        return <Tag className={styles.networkTag}>{network}({row.chain_id})</Tag>;
    }

    // 上传文件
    const handleFileUpload = (file: File, type: 'sol' | 'abi' | 'bytecode') => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (type === 'sol') {
                setSolCode(content);
            } else if (type === 'abi') {
                setManualAbi(content);
                // 自动解析构造函数参数
                parseConstructorParams(content);
            } else if (type === 'bytecode') {
                setManualBytecode(content);
            }
            message.success(`${type.toUpperCase()} 文件读取成功`);
        };
        reader.readAsText(file);
        return false; // 阻止自动上传
    };

    // 统计数据
    const totalContracts = pagination.total;
    const deployedContracts = listData.filter(c => c.status === 'deployed').length;
    const undeployedContracts = listData.filter(c => c.status === 'undeployed').length;
    const uniqueNetworks = new Set(listData.filter(c => c.network).map(c => c.network)).size;

    // 渲染合约详情
    const renderContractDetail = () => {
        if (!currentContract) return null;

        let abi: any[] = [];
        try {
            if (currentContract.abi) {
                abi = JSON.parse(currentContract.abi);
            }
        } catch (e) {
            console.error('解析ABI失败:', e);
        }

        const methods = abi.filter((item: any) => item.type === 'function');
        const events = abi.filter((item: any) => item.type === 'event');

        return (
            <div className={styles.contractDetail}>
                <Tabs defaultActiveKey="info">
                    <TabPane tab="基本信息" key="info">
                        <dl>
                            <dt>合约名称：</dt>
                            <dd>{currentContract.name}</dd>
                        </dl>
                        <dl>
                            <dt>合约地址：</dt>
                            <dd>
                                {currentContract.address ? (
                                    <Space>
                                        <Text code>{currentContract.address}</Text>
                                        <Button 
                                            size="small" 
                                            icon={<CopyOutlined />} 
                                            onClick={() => {
                                                if (currentContract.address) {
                                                    copyToClip(currentContract.address);
                                                    message.success('已复制');
                                                }
                                            }}
                                        />
                                    </Space>
                                ) : (
                                    <Text type="secondary">未部署</Text>
                                )}
                            </dd>
                        </dl>
                        <dl>
                            <dt>部署账户：</dt>
                            <dd>
                                {currentContract.deployer_address ? (
                                    <Text code>{currentContract.deployer_address}</Text>
                                ) : (
                                    <Text type="secondary">-</Text>
                                )}
                            </dd>
                        </dl>
                        <dl>
                            <dt>网络：</dt>
                            <dd>
                                {currentContract.network && currentContract.chain_id ? (
                                    `${currentContract.network} (Chain ID: ${currentContract.chain_id})`
                                ) : (
                                    <Text type="secondary">-</Text>
                                )}
                            </dd>
                        </dl>
                        <dl>
                            <dt>状态：</dt>
                            <dd>{renderStatus(currentContract.status, currentContract)}</dd>
                        </dl>
                        <dl>
                            <dt>部署时间：</dt>
                            <dd>{dayjs(currentContract.create_time).format('YYYY-MM-DD HH:mm:ss')}</dd>
                        </dl>
                        {currentContract.remark && (
                            <dl>
                                <dt>备注：</dt>
                                <dd><Text>{currentContract.remark}</Text></dd>
                            </dl>
                        )}
                    </TabPane>

                    <TabPane tab={`方法 (${methods.length})`} key="methods">
                        <Collapse accordion>
                            {methods.map((method: any, index: number) => (
                                <Panel 
                                    header={
                                        <Space>
                                            <Tag color={method.stateMutability === 'view' || method.stateMutability === 'pure' ? 'blue' : 'orange'}>
                                                {method.stateMutability || 'nonpayable'}
                                            </Tag>
                                            <Text strong>{method.name}</Text>
                                        </Space>
                                    } 
                                    key={index}
                                >
                                    <div>
                                        <Text strong>输入参数：</Text>
                                        {method.inputs && method.inputs.length > 0 ? (
                                            <ul>
                                                {method.inputs.map((input: any, idx: number) => (
                                                    <li key={idx}>
                                                        <Text code>{input.type}</Text> {input.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <Text type="secondary"> 无</Text>
                                        )}
                                        
                                        <Text strong>输出参数：</Text>
                                        {method.outputs && method.outputs.length > 0 ? (
                                            <ul>
                                                {method.outputs.map((output: any, idx: number) => (
                                                    <li key={idx}>
                                                        <Text code>{output.type}</Text> {output.name || `return${idx}`}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <Text type="secondary"> 无</Text>
                                        )}
                                    </div>
                                </Panel>
                            ))}
                        </Collapse>
                    </TabPane>

                    <TabPane tab={`事件 (${events.length})`} key="events">
                        <Collapse accordion>
                            {events.map((event: any, index: number) => (
                                <Panel header={<Text strong>{event.name}</Text>} key={index}>
                                    <div>
                                        <Text strong>参数：</Text>
                                        {event.inputs && event.inputs.length > 0 ? (
                                            <ul>
                                                {event.inputs.map((input: any, idx: number) => (
                                                    <li key={idx}>
                                                        <Text code>{input.type}</Text> {input.name}
                                                        {input.indexed && <Tag color="blue">indexed</Tag>}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <Text type="secondary"> 无</Text>
                                        )}
                                    </div>
                                </Panel>
                            ))}
                        </Collapse>
                    </TabPane>

                    <TabPane tab="源代码" key="source">
                        <div className={styles.sourceCode}>
                            <pre>{currentContract.source_code || '源代码不可用'}</pre>
                        </div>
                    </TabPane>

                    <TabPane tab="ABI" key="abi">
                        <div className={styles.abiCode}>
                            <pre>{JSON.stringify(abi, null, 2)}</pre>
                        </div>
                    </TabPane>
                </Tabs>
            </div>
        );
    };

    // 渲染合约交互界面
    const renderContractInteract = () => {
        if (!currentContract) return null;

        if (!currentContract.abi) {
            return (
                <Alert
                    message="无法交互"
                    description="此合约尚未编译或缺少ABI信息，无法进行交互。"
                    type="warning"
                    showIcon
                />
            );
        }

        let abi: any[] = [];
        try {
            abi = JSON.parse(currentContract.abi);
        } catch (e) {
            console.error('解析ABI失败:', e);
            return (
                <Alert
                    message="ABI解析失败"
                    description="合约ABI格式不正确，无法进行交互。"
                    type="error"
                    showIcon
                />
            );
        }

        const methods = abi.filter((item: any) => item.type === 'function');
        const selectedMethod = interactForm.getFieldValue('method');
        const methodAbi = methods.find((m: any) => m.name === selectedMethod);

        return (
            <Form form={interactForm} layout="vertical">
                <Form.Item
                    name="method"
                    label="选择方法"
                    rules={[{ required: true, message: '请选择方法' }]}
                >
                    <Select 
                        placeholder="请选择要调用的方法"
                        onChange={() => interactForm.resetFields(['accountId'])}
                    >
                        {methods.map((method: any, index: number) => (
                            <Option key={index} value={method.name}>
                                <Space>
                                    <Tag color={method.stateMutability === 'view' || method.stateMutability === 'pure' ? 'blue' : 'orange'}>
                                        {method.stateMutability || 'nonpayable'}
                                    </Tag>
                                    {method.name}
                                </Space>
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                {methodAbi && methodAbi.inputs && methodAbi.inputs.length > 0 && (
                    <>
                        <Text strong>方法参数：</Text>
                        {methodAbi.inputs.map((input: any, index: number) => (
                            <Form.Item
                                key={index}
                                name={`param_${input.name}`}
                                label={`${input.name} (${input.type})`}
                                rules={[{ required: true, message: `请输入${input.name}` }]}
                            >
                                <Input placeholder={`请输入${input.type}类型的值`} />
                            </Form.Item>
                        ))}
                    </>
                )}

                {methodAbi && 
                 methodAbi.stateMutability !== 'view' && 
                 methodAbi.stateMutability !== 'pure' && (
                    <Form.Item
                        name="accountId"
                        label="交易账户"
                        rules={[{ required: true, message: '请选择交易账户' }]}
                    >
                        <Select placeholder="请选择用于签名交易的账户">
                            {accountList
                                .filter(acc => acc.private_key)
                                .map(account => (
                                    <Option key={account.id} value={account.id}>
                                        {account.name} ({account.address.substring(0, 8)}...)
                                    </Option>
                                ))}
                        </Select>
                    </Form.Item>
                )}
            </Form>
        );
    };

    return (
        <div className={`f-fit-height f-flex-col ${styles.contractDeploy}`}>
            {/* 统计卡片 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <Card className={styles.statsCard}>
                        <Statistic
                            title="合约总数"
                            value={totalContracts}
                            prefix={<FileTextOutlined />}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className={styles.statsCard}>
                        <Statistic
                            title="已部署"
                            value={deployedContracts}
                            prefix={<CheckCircleOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className={styles.statsCard}>
                        <Statistic
                            title="未部署"
                            value={undeployedContracts}
                            prefix={<FileTextOutlined />}
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className={styles.statsCard}>
                        <Statistic
                            title="网络数"
                            value={uniqueNetworks}
                            prefix={<LinkOutlined />}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
            </Row>

            <div className="f-flex-two-side">
                <QueryBar onChange={onQuery} spinning={spinning} className={styles.queryBar}>
                    <QueryBar.QueryItem name="name" label="合约名称">
                        <Input allowClear placeholder="请输入合约名称"/>
                    </QueryBar.QueryItem>

                    <QueryBar.QueryItem name="address" label="合约地址">
                        <Input allowClear placeholder="请输入合约地址"/>
                    </QueryBar.QueryItem>

                    <QueryBar.QueryItem name="network" label="网络">
                        <Select allowClear placeholder="请选择网络">
                            <Option value="mainnet">mainnet</Option>
                            <Option value="sepolia">sepolia</Option>
                            <Option value="goerli">goerli</Option>
                        </Select>
                    </QueryBar.QueryItem>

                    <QueryBar.QueryItem name="status" label="状态">
                        <Select allowClear placeholder="请选择状态">
                            <Option value="undeployed">未部署</Option>
                            <Option value="deployed">已部署</Option>
                            <Option value="pending">部署中</Option>
                            <Option value="failed">部署失败</Option>
                        </Select>
                    </QueryBar.QueryItem>
                </QueryBar>

                <Space>
                    <Button 
                        type="primary" 
                        icon={<RocketOutlined />} 
                        onClick={onCreateContract}
                        size="large"
                    >
                        部署合约
                    </Button>
                </Space>
            </div>

            <div className={`f-flex-1 ${styles.tableContainer}`} style={{ margin: '12px 0' }}>
                <Table 
                    dataSource={listData} 
                    size="small" 
                    pagination={{
                        current: pagination.page,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        onChange: (page, pageSize) => {
                            pagination.setPage(page);
                            pagination.setPageSize(pageSize);
                        },
                        showTotal: (total) => `共 ${total} 条记录`,
                        showSizeChanger: true,
                        showQuickJumper: true
                    }}
                    rowKey="id"
                    scroll={{ x: 1400 }}
                >
                    <Column title="合约名称" dataIndex="name" key="name" width={150}/>
                    <Column 
                        title="合约地址" 
                        dataIndex="address" 
                        key="address" 
                        render={renderCopyableCell}
                        width={180}
                    />
                    <Column 
                        title="部署账户" 
                        dataIndex="deployer_address" 
                        key="deployer_address" 
                        render={renderCopyableCell}
                        width={180}
                    />
                    <Column 
                        title="网络" 
                        dataIndex="network" 
                        key="network" 
                        render={renderNetwork}
                        width={120}
                    />
                    <Column 
                        title="状态" 
                        dataIndex="status" 
                        key="status" 
                        render={(status, row: IContract) => renderStatus(status, row)}
                        width={100}
                    />
                    <Column 
                        title="部署时间" 
                        dataIndex="create_time" 
                        key="create_time"
                        render={(time) => dayjs(time).format('YYYY-MM-DD HH:mm:ss')}
                        width={180}
                    />
                    <Column 
                        title="操作" 
                        dataIndex="action" 
                        key="action" 
                        fixed="right" 
                        width={240} 
                        render={renderAction}
                    />
                </Table>
            </div>

            {/* 部署合约Modal */}
            <Modal
                title={<Space><RocketOutlined />部署智能合约</Space>}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                width={1000}
                className={styles.deployModal}
                footer={[
                    <Button key="cancel" onClick={() => setIsModalVisible(false)}>
                        取消
                    </Button>,
                    <Button 
                        key="save" 
                        icon={<FileTextOutlined />} 
                        onClick={saveAsDraft}
                        disabled={deploying}
                    >
                        暂存
                    </Button>,
                    <Button 
                        key="deploy" 
                        type="primary" 
                        icon={<RocketOutlined />}
                        onClick={deployContract}
                        loading={deploying}
                        disabled={!manualAbi || !manualBytecode}
                    >
                        部署合约
                    </Button>
                ]}
            >
                <Form form={form} layout="vertical">
                    {/* 基本信息 */}
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="contractName"
                                label={<Text strong>合约名称</Text>}
                                rules={[{ required: true, message: '请输入合约名称' }]}
                            >
                                <Input 
                                    placeholder="请输入合约名称"
                                    prefix={<FileTextOutlined />}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="remark"
                                label={<Text strong>备注</Text>}
                            >
                                <Input 
                                    placeholder="请输入备注信息（可选）"
                                    prefix={<EditOutlined />}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Tabs defaultActiveKey="upload" animated={{ inkBar: true, tabPane: true }}>
                        <TabPane 
                            tab={<span><CloudUploadOutlined />上传合约文件</span>} 
                            key="upload"
                        >
                            <Space direction="vertical" style={{ width: '100%' }} size="large">
                                {/* Sol 文件（可选） */}
                                <div>
                                    <Space style={{ marginBottom: 8 }}>
                                        <Text strong>Solidity 源代码（可选）</Text>
                                        <Upload
                                            accept=".sol"
                                            beforeUpload={(file) => handleFileUpload(file, 'sol')}
                                            showUploadList={false}
                                        >
                                            <Button size="small" icon={<CloudUploadOutlined />}>
                                                上传 .sol 文件
                                            </Button>
                                        </Upload>
                                    </Space>
                                    <TextArea
                                        value={solCode}
                                        onChange={(e) => setSolCode(e.target.value)}
                                        placeholder="请输入或上传Solidity源代码（可选，仅用于存档）"
                                        rows={8}
                                        className={styles.codeEditor}
                                    />
                                </div>

                                {/* ABI（必需） */}
                                <div>
                                    <Space style={{ marginBottom: 8 }}>
                                        <Text strong><Text type="danger">*</Text> 合约 ABI (JSON格式)</Text>
                                        <Upload
                                            accept=".json,.abi"
                                            beforeUpload={(file) => handleFileUpload(file, 'abi')}
                                            showUploadList={false}
                                        >
                                            <Button size="small" icon={<CloudUploadOutlined />}>
                                                上传 ABI 文件
                                            </Button>
                                        </Upload>
                                    </Space>
                                    <TextArea
                                        value={manualAbi}
                                        onChange={(e) => {
                                            setManualAbi(e.target.value);
                                            // 自动解析构造函数参数
                                            if (e.target.value) {
                                                parseConstructorParams(e.target.value);
                                            }
                                        }}
                                        placeholder='请输入或上传合约ABI，例如：[{"type":"constructor","inputs":[],...}]'
                                        rows={8}
                                        className={styles.codeEditor}
                                    />
                                </div>

                                {/* Bytecode（必需） */}
                                <div>
                                    <Space style={{ marginBottom: 8 }}>
                                        <Text strong><Text type="danger">*</Text> 合约 Bytecode</Text>
                                        <Upload
                                            accept=".bin,.txt"
                                            beforeUpload={(file) => handleFileUpload(file, 'bytecode')}
                                            showUploadList={false}
                                        >
                                            <Button size="small" icon={<CloudUploadOutlined />}>
                                                上传 Bytecode 文件
                                            </Button>
                                        </Upload>
                                    </Space>
                                    <TextArea
                                        value={manualBytecode}
                                        onChange={(e) => setManualBytecode(e.target.value)}
                                        placeholder="请输入或上传合约Bytecode，例如：0x608060405234801561001057..."
                                        rows={5}
                                        className={styles.codeEditor}
                                    />
                                </div>

                                <Alert
                                    message="提示"
                                    description={
                                        <div>
                                            <p>请使用 Remix、Hardhat 或其他工具编译您的合约，然后将编译结果上传到这里。</p>
                                            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                                                <li>ABI 和 Bytecode 是部署合约的必需项</li>
                                                <li>Solidity 源代码是可选的，仅用于存档和查看</li>
                                                <li>支持手动输入或上传文件</li>
                                            </ul>
                                        </div>
                                    }
                                    type="info"
                                    showIcon
                                />
                            </Space>
                        </TabPane>

                        <TabPane 
                            tab={<span><RocketOutlined />部署配置</span>} 
                            key="deploy"
                        >
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                <Form.Item
                                    name="accountId"
                                    label="部署账户"
                                    rules={[{ required: true, message: '请选择部署账户' }]}
                                >
                                    <Select 
                                        placeholder="请选择用于部署的账户"
                                        onChange={(value) => {
                                            const account = accountList.find(a => a.id === value);
                                            setSelectedAccount(account || null);
                                        }}
                                    >
                                        {accountList
                                            .filter(acc => acc.private_key)
                                            .map(account => (
                                                <Option key={account.id} value={account.id}>
                                                    <Space>
                                                        <WalletOutlined />
                                                        {account.name}
                                                        <Text type="secondary">
                                                            ({account.address.substring(0, 8)}...)
                                                        </Text>
                                                        <Tag>{account.network}</Tag>
                                                    </Space>
                                                </Option>
                                            ))}
                                    </Select>
                                </Form.Item>

                                {constructorParams.length > 0 && (
                                    <>
                                        <Title level={5}>构造函数参数</Title>
                                        {constructorParams.map((param: any, index: number) => (
                                            <Form.Item
                                                key={index}
                                                name={`param_${param.name}`}
                                                label={`${param.name} (${param.type})`}
                                                rules={[{ required: true, message: `请输入${param.name}` }]}
                                            >
                                                <Input 
                                                    placeholder={`请输入${param.type}类型的值`}
                                                    prefix={<CodeOutlined />}
                                                />
                                            </Form.Item>
                                        ))}
                                    </>
                                )}
                                
                                {constructorParams.length === 0 && (
                                    <Alert
                                        message="无构造函数参数"
                                        description="此合约没有构造函数参数，可以直接部署。"
                                        type="success"
                                        showIcon
                                    />
                                )}
                            </Space>
                        </TabPane>
                    </Tabs>
                </Form>
            </Modal>

            {/* 合约详情Modal */}
            <Modal
                title={<Space><FileTextOutlined />合约详情</Space>}
                open={isDetailModalVisible}
                onCancel={() => setIsDetailModalVisible(false)}
                width={900}
                footer={[
                    <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
                        关闭
                    </Button>
                ]}
                className={styles.detailModal}
            >
                {renderContractDetail()}
            </Modal>

            {/* 合约交互Modal */}
            <Modal
                title={<Space><InteractionOutlined />合约交互</Space>}
                open={isInteractModalVisible}
                onOk={callContractMethod}
                onCancel={() => setIsInteractModalVisible(false)}
                width={700}
                okText="调用"
                cancelText="取消"
                className={styles.interactModal}
            >
                {renderContractInteract()}
            </Modal>
        </div>
    )
}

