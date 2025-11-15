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

// 序列化包含 BigInt 的值
function serializeBigInt(value: any): any {
    // 处理 null 和 undefined
    if (value === null || value === undefined) {
        return value;
    }
    
    // 处理 BigInt
    if (typeof value === 'bigint') {
        return value.toString();
    }
    
    // 处理数组
    if (Array.isArray(value)) {
        return value.map(item => serializeBigInt(item));
    }
    
    // 处理对象（包括 ethers.js 的 Result 类型）
    if (typeof value === 'object') {
        // 检查是否是 ethers.js 的 Result 类型（有 length 属性和数字索引）
        if (typeof value.length === 'number' && value.length > 0) {
            // 可能是数组或 Result 类型，尝试转换为数组
            const arr: any[] = [];
            for (let i = 0; i < value.length; i++) {
                arr.push(serializeBigInt(value[i]));
            }
            // 如果有命名属性，也保留
            const result: any = arr;
            for (const key in value) {
                if (!/^\d+$/.test(key) && value.hasOwnProperty(key)) {
                    result[key] = serializeBigInt(value[key]);
                }
            }
            return result;
        }
        
        // 普通对象
        const result: any = {};
        for (const key in value) {
            if (value.hasOwnProperty(key)) {
                result[key] = serializeBigInt(value[key]);
            }
        }
        return result;
    }
    
    return value;
}

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
    const [networkList, setNetworkList] = useState<any[]>([]);
    const [selectedNetwork, setSelectedNetwork] = useState<any | null>(null);

    useEffect(() => {
        onQuery();
        loadAccounts();
        loadNetworks();
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

    async function loadNetworks() {
        try {
            // @ts-ignore
            // 加载所有网络（包括已禁用的），用于映射显示
            const { data } = await fetch.get('/api/eth/network', { 
                params: { page: 1, limit: 1000 } 
            });
            setNetworkList(data || []);
        } catch (e: any) {
            console.error('加载网络列表失败:', e);
            message.error('加载网络列表失败');
        }
    }

    async function onQuery() {
        try {
            updateSpinning(true);

            // 先更新网络和账户列表，确保映射最新数据
            await Promise.all([
                loadNetworks(),
                loadAccounts()
            ]);

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

            const contractData: any = {
                name: values.contractName,
                abi: abiToSave,
                bytecode: bytecodeToSave,
                source_code: solCode || '', // sol 文件可选
                status: 'undeployed',
                remark: values.remark || ''
            };

            // 如果选择了网络，添加网络信息
            if (selectedNetwork) {
                contractData.network_id = selectedNetwork.id;
            }

            // 如果选择了账户，添加账户信息（暂存时可能需要记录意向账户）
            if (selectedAccount) {
                contractData.deployer_account_id = selectedAccount.id;
                contractData.deployer_address = selectedAccount.address;
            }

            // 判断是更新还是创建
            if (currentContract && currentContract.id) {
                // 更新现有合约
                await fetch.put('/api/eth/contract', {
                    id: currentContract.id,
                    ...contractData
                });
                message.success('合约已更新');
            } else {
                // 创建新合约
                await fetch.post('/api/eth/contract', contractData);
                message.success('合约已暂存');
            }

            setIsModalVisible(false);
            onQuery();
            
            // 重置表单
            form.resetFields();
            setSolCode('');
            setConstructorParams([]);
            setManualAbi('');
            setManualBytecode('');
            setCurrentContract(null);

        } catch (e: any) {
            console.error('暂存失败:', e);
            message.error('暂存失败: ' + e.message);
        } finally {
            setDeploying(false);
        }
    }, [form, solCode, manualAbi, manualBytecode, currentContract, selectedNetwork, selectedAccount, onQuery]);

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

        if (!selectedNetwork) {
            message.error('请选择部署网络');
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

            // 使用选择的网络
            const network = selectedNetwork;

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

            const contractData = {
                name: values.contractName,
                address: contractAddress,
                deployer_address: selectedAccount.address,
                deployer_account_id: selectedAccount.id,
                network_id: network.id,
                network: network.name,
                chain_id: network.chain_id,
                abi: manualAbi,
                bytecode: manualBytecode,
                source_code: solCode || '', // sol 文件可选
                constructor_params: JSON.stringify(params),
                status: 'deployed',
                remark: values.remark || ''
            };

            // 判断是更新还是创建
            if (currentContract && currentContract.id) {
                // 更新现有合约（从未部署状态转为已部署）
                await fetch.put('/api/eth/contract', {
                    id: currentContract.id,
                    ...contractData
                });
            } else {
                // 创建新合约
                await fetch.post('/api/eth/contract', contractData);
            }

            message.success({ content: '部署成功', key: 'deploy' });
            setIsModalVisible(false);
            onQuery();
            
            // 重置表单
            form.resetFields();
            setSolCode('');
            setConstructorParams([]);
            setManualAbi('');
            setManualBytecode('');
            setSelectedNetwork(null);
            setCurrentContract(null);

        } catch (e: any) {
            console.error('部署失败:', e);
            message.error({ content: '部署失败: ' + e.message, key: 'deploy' });
        } finally {
            setDeploying(false);
        }
    }, [manualAbi, manualBytecode, selectedAccount, selectedNetwork, form, constructorParams, solCode, currentContract, onQuery]);

    function onCreateContract() {
        setEditingContract(null);
        setCurrentContract(null);
        form.resetFields();
        setSolCode('');
        setConstructorParams([]);
        setSelectedAccount(null);
        setSelectedNetwork(null);
        setManualAbi('');
        setManualBytecode('');
        setIsModalVisible(true);
    }

    function onCancelModal() {
        setIsModalVisible(false);
        setCurrentContract(null);
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

    // 复制已部署的合约 - 打开对话框预填充数据
    const onCopyContract = useCallback((contract: IContract) => {
        // 重置当前合约（不关联原合约ID，这样会创建新合约而不是更新）
        setCurrentContract(null);
        
        // 加载合约信息到表单
        setSolCode(contract.source_code || '');
        setManualAbi(contract.abi || '');
        setManualBytecode(contract.bytecode || '');
        
        // 如果有 ABI，解析构造函数参数
        if (contract.abi) {
            parseConstructorParams(contract.abi);
        } else {
            setConstructorParams([]);
        }
        
        // 准备表单字段
        const formValues: any = {
            contractName: `${contract.name} (副本)`,
            remark: contract.remark ? `复制自: ${contract.name}` : `复制自: ${contract.name}`
        };

        // 如果合约有关联的账户，预设选择
        if (contract.deployer_account_id) {
            const account = accountList.find(a => a.id === contract.deployer_account_id);
            setSelectedAccount(account || null);
            formValues.accountId = contract.deployer_account_id;
        }
        
        // 如果合约有关联的网络，预设选择
        if (contract.network_id) {
            const network = networkList.find(n => n.id === contract.network_id);
            setSelectedNetwork(network || null);
            formValues.networkId = contract.network_id;
        }

        // 设置表单值
        form.setFieldsValue(formValues);

        // 打开部署对话框
        setIsModalVisible(true);
        message.info('已复制合约信息，请编辑后保存或部署');
    }, [form, parseConstructorParams, networkList, accountList]);

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
                
                // 序列化 BigInt 和其他无法序列化的值
                const serializedResult = serializeBigInt(result);
                
                Modal.info({
                    title: '调用结果',
                    width: 600,
                    content: (
                        <div>
                            <Text strong>方法: </Text><Text>{methodName}</Text><br/>
                            <Text strong>返回值: </Text><Text code>{JSON.stringify(serializedResult, null, 2)}</Text>
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

    // 切换合约状态（在 deployed 和 deprecated 之间切换）
    const toggleContractStatus = useCallback(async (contract: IContract) => {
        const currentStatus = contract.status;
        const newStatus = currentStatus === 'deployed' ? 'deprecated' : 'deployed';
        const actionText = newStatus === 'deprecated' ? '作废' : '恢复';
        
        confirm({
            title: `${actionText}确认`,
            icon: <ExclamationCircleFilled />,
            content: `确定要将合约 "${contract.name}" ${actionText === '作废' ? '标记为已作废' : '恢复为已部署'}吗？`,
            okText: actionText,
            okType: actionText === '作废' ? 'danger' : 'primary',
            cancelText: '取消',
            async onOk() {
                try {
                    await fetch.put('/api/eth/contract', {
                        id: contract.id,
                        status: newStatus
                    });
                    message.success(`${actionText}成功`);
                    onQuery();
                } catch (e: any) {
                    message.error(e.message || `${actionText}失败`);
                }
            },
        });
    }, [onQuery]);

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
        
        // 准备表单字段
        const formValues: any = {
            contractName: contract.name,
            remark: contract.remark
        };

        // 如果合约有关联的账户，预设选择
        if (contract.deployer_account_id) {
            const account = accountList.find(a => a.id === contract.deployer_account_id);
            setSelectedAccount(account || null);
            formValues.accountId = contract.deployer_account_id;
        }
        
        // 如果合约有关联的网络，预设选择
        if (contract.network_id) {
            const network = networkList.find(n => n.id === contract.network_id);
            setSelectedNetwork(network || null);
            formValues.networkId = contract.network_id;
        }

        // 设置表单值
        form.setFieldsValue(formValues);

        setIsModalVisible(true);
    }, [form, parseConstructorParams, networkList, accountList]);

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

        // 已部署或已作废的合约显示交互按钮
        const canToggleStatus = row.status === 'deployed' || row.status === 'deprecated';
        
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
                {row.status === 'deployed' && (
                    <Button 
                        size="small" 
                        icon={<InteractionOutlined />} 
                        onClick={() => onInteractContract(row)}
                    >
                        交互
                    </Button>
                )}
                <Button 
                    size="small" 
                    icon={<CopyOutlined />} 
                    onClick={() => onCopyContract(row)}
                >
                    复制
                </Button>
                {canToggleStatus && (
                    <Button 
                        size="small" 
                        type={row.status === 'deployed' ? 'default' : 'primary'}
                        danger={row.status === 'deployed'}
                        icon={row.status === 'deployed' ? <ExclamationCircleFilled /> : <CheckCircleOutlined />}
                        onClick={() => toggleContractStatus(row)}
                    >
                        {row.status === 'deployed' ? '作废' : '恢复'}
                    </Button>
                )}
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
            'failed': { color: 'error', icon: <ExclamationCircleFilled />, text: '部署失败' },
            'deprecated': { color: 'warning', icon: <ExclamationCircleFilled />, text: '已作废' }
        };
        const config = statusConfig[status] || statusConfig.deployed;
        return <Tag icon={config.icon} color={config.color}>{config.text}</Tag>;
    }

    function renderNetwork(network: string, row: any) {
        // 优先使用 network_id 从列表中查找
        if (row.network_id) {
            const foundNetwork = networkList.find(n => n.id === row.network_id);
            if (foundNetwork) {
                return (
                    <Tag className={styles.networkTag}>
                        {foundNetwork.name} (Chain: {foundNetwork.chain_id})
                    </Tag>
                );
            } else {
                return (
                    <Text type="warning">
                        未知网络ID：{row.network_id}
                    </Text>
                );
            }
        }
        
        // 降级：使用原有的 network 和 chain_id 字段
        if (!network || !row.chain_id) {
            return <Text type="secondary">-</Text>;
        }
        return <Tag className={styles.networkTag}>{network}({row.chain_id})</Tag>;
    }

    function renderDeployerAccount(deployerAddress: string | undefined, row: any) {
        // 判断是否为未部署状态
        const isUndeployed = row.status === 'undeployed';
        
        // 如果有 deployer_account_id，尝试从列表中查找账户信息
        if (row.deployer_account_id) {
            const foundAccount = accountList.find(a => a.id === row.deployer_account_id);
            if (foundAccount) {
                return (
                    <Space direction="vertical" size={0}>
                        {isUndeployed ? (
                            <Text strong style={{ fontSize: '12px', color: '#faad14' }}>
                                <ExclamationCircleFilled style={{ marginRight: 4 }} />
                                拟部署在此账号: {foundAccount.name}
                            </Text>
                        ) : (
                            <Text strong style={{ fontSize: '12px' }}>{foundAccount.name}</Text>
                        )}
                        {deployerAddress && (
                            <Button
                                size="small"
                                type="link"
                                icon={<CopyOutlined />}
                                className={styles.copyButton}
                                onClick={() => {
                                    copyToClip(deployerAddress);
                                    message.success('已复制地址');
                                }}
                                style={{ padding: 0, height: 'auto' }}
                            >
                                {deployerAddress.substring(0, 8)}...{deployerAddress.substring(deployerAddress.length - 6)}
                            </Button>
                        )}
                    </Space>
                );
            } else {
                return (
                    <Space direction="vertical" size={0}>
                        <Text type="warning" style={{ fontSize: '12px' }}>
                            {isUndeployed && <ExclamationCircleFilled style={{ marginRight: 4 }} />}
                            未知账户ID：{row.deployer_account_id}
                        </Text>
                        {deployerAddress && (
                            <Button
                                size="small"
                                type="link"
                                icon={<CopyOutlined />}
                                className={styles.copyButton}
                                onClick={() => {
                                    copyToClip(deployerAddress);
                                    message.success('已复制地址');
                                }}
                                style={{ padding: 0, height: 'auto' }}
                            >
                                {deployerAddress.substring(0, 8)}...{deployerAddress.substring(deployerAddress.length - 6)}
                            </Button>
                        )}
                    </Space>
                );
            }
        }

        // 如果没有 deployer_account_id 但有地址
        if (deployerAddress) {
            return (
                <Button
                    size="small"
                    type="link"
                    icon={<CopyOutlined />}
                    className={styles.copyButton}
                    onClick={() => {
                        copyToClip(deployerAddress);
                        message.success('已复制地址');
                    }}
                >
                    {deployerAddress.substring(0, 8)}...{deployerAddress.substring(deployerAddress.length - 6)}
                </Button>
            );
        }

        // 完全没有信息
        return <Text type="secondary">-</Text>;
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

    // 处理编译结果文件（支持 Hardhat、Remix 等）
    const handleHardhatArtifactUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const artifact = JSON.parse(content);
                
                let abi = null;
                let bytecode = null;
                let contractName = '';
                let compilerType = '';

                // 检测 Hardhat 格式
                if (artifact.abi && artifact.bytecode) {
                    abi = artifact.abi;
                    bytecode = artifact.bytecode;
                    contractName = artifact.contractName || '';
                    compilerType = 'Hardhat';
                    
                    // 如果有源代码名称，可以作为备注
                    if (artifact.sourceName && !form.getFieldValue('remark')) {
                        form.setFieldValue('remark', `从 Hardhat 编译结果导入: ${artifact.sourceName}`);
                    }
                }
                // 检测 Remix 格式（通常包含在一个对象的 contracts 字段中）
                else if (artifact.contracts) {
                    // Remix 格式：{ contracts: { "ContractName": { abi: [...], bin: "0x..." } } }
                    const contracts = artifact.contracts;
                    const contractKeys = Object.keys(contracts);
                    
                    if (contractKeys.length > 0) {
                        const firstContract = contracts[contractKeys[0]];
                        abi = firstContract.abi;
                        bytecode = firstContract.bin || firstContract.evm?.bytecode?.object;
                        contractName = contractKeys[0];
                        compilerType = 'Remix';
                    }
                }
                // 检测 Truffle 格式
                else if (artifact.abi && artifact.bytecode === undefined && artifact.unlinked_binary) {
                    abi = artifact.abi;
                    bytecode = artifact.unlinked_binary;
                    contractName = artifact.contract_name || artifact.contractName || '';
                    compilerType = 'Truffle';
                }

                // 验证是否成功提取
                if (!abi || !bytecode) {
                    message.error('无法识别的编译结果格式，请确保文件包含 abi 和 bytecode 字段');
                    return;
                }

                // 提取并填充 ABI
                const abiString = JSON.stringify(abi, null, 2);
                setManualAbi(abiString);
                parseConstructorParams(abiString);

                // 提取并填充 Bytecode（确保有 0x 前缀）
                const bytecodeWithPrefix = bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`;
                setManualBytecode(bytecodeWithPrefix);

                // 如果有合约名称且表单中合约名称为空，自动填充
                if (contractName && !form.getFieldValue('contractName')) {
                    form.setFieldValue('contractName', contractName);
                }

                message.success({
                    content: `成功导入 ${compilerType} 编译结果: ${contractName || file.name}`,
                    duration: 3
                });
            } catch (error: any) {
                console.error('解析编译结果失败:', error);
                message.error('解析文件失败，请确保上传的是有效的编译结果 JSON 文件');
            }
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
                                {(() => {
                                    const isUndeployed = currentContract.status === 'undeployed';
                                    
                                    // 如果有账户ID
                                    if (currentContract.deployer_account_id) {
                                        const account = accountList.find(a => a.id === currentContract.deployer_account_id);
                                        return (
                                            <Space direction="vertical" size={0}>
                                                {account ? (
                                                    isUndeployed ? (
                                                        <Text strong style={{ color: '#faad14' }}>
                                                            <ExclamationCircleFilled style={{ marginRight: 4 }} />
                                                            拟部署在此账号: {account.name}
                                                        </Text>
                                                    ) : (
                                                        <Text strong>{account.name}</Text>
                                                    )
                                                ) : (
                                                    <Text type="warning">未知账户ID：{currentContract.deployer_account_id}</Text>
                                                )}
                                                {currentContract.deployer_address && (
                                                    <Text code>{currentContract.deployer_address}</Text>
                                                )}
                                            </Space>
                                        );
                                    }
                                    
                                    // 只有地址没有账户ID
                                    if (currentContract.deployer_address) {
                                        return <Text code>{currentContract.deployer_address}</Text>;
                                    }
                                    
                                    // 什么都没有
                                    return <Text type="secondary">-</Text>;
                                })()}
                            </dd>
                        </dl>
                        <dl>
                            <dt>网络：</dt>
                            <dd>
                                {(() => {
                                    if (currentContract.network_id) {
                                        const network = networkList.find(n => n.id === currentContract.network_id);
                                        if (network) {
                                            return `${network.name} (Chain ID: ${network.chain_id})`;
                                        } else {
                                            return <Text type="warning">未知网络ID：{currentContract.network_id}</Text>;
                                        }
                                    } else if (currentContract.network && currentContract.chain_id) {
                                        return `${currentContract.network} (Chain ID: ${currentContract.chain_id})`;
                                    } else {
                                        return <Text type="secondary">-</Text>;
                                    }
                                })()}
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

        return (
            <Form form={interactForm} layout="vertical">
                <Form.Item
                    name="method"
                    label="选择方法"
                    rules={[{ required: true, message: '请选择方法' }]}
                >
                    <Select 
                        placeholder="请选择要调用的方法"
                        onChange={(value) => {
                            interactForm.resetFields(['accountId']);
                            // 清除之前的参数值
                            if (value) {
                                const methodAbi = methods.find((m: any) => m.name === value);
                                if (methodAbi && methodAbi.inputs) {
                                    methodAbi.inputs.forEach((input: any) => {
                                        interactForm.setFieldValue(`param_${input.name}`, undefined);
                                    });
                                }
                            }
                        }}
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

                <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.method !== currentValues.method}>
                    {() => {
                        const selectedMethod = interactForm.getFieldValue('method');
                        const methodAbi = methods.find((m: any) => m.name === selectedMethod);
                        
                        return (
                            <>
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
                            </>
                        );
                    }}
                </Form.Item>
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
                            <Option value="deprecated">已作废</Option>
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
                        key="deployer_account" 
                        render={(_, row: IContract) => renderDeployerAccount(row.deployer_address, row)}
                        width={200}
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
                        width={300} 
                        render={renderAction}
                    />
                </Table>
            </div>

            {/* 部署合约Modal */}
            <Modal
                title={<Space><RocketOutlined />{currentContract?.id ? '编辑并部署合约' : '部署智能合约'}</Space>}
                open={isModalVisible}
                onCancel={onCancelModal}
                width={1000}
                className={styles.deployModal}
                footer={[
                    <Button key="cancel" onClick={onCancelModal}>
                        取消
                    </Button>,
                    <Button 
                        key="save" 
                        icon={<FileTextOutlined />} 
                        onClick={saveAsDraft}
                        disabled={deploying}
                    >
                        {currentContract?.id ? '更新' : '暂存'}
                    </Button>,
                    <Button 
                        key="deploy" 
                        type="primary" 
                        icon={<RocketOutlined />}
                        onClick={deployContract}
                        loading={deploying}
                        disabled={!manualAbi || !manualBytecode || !selectedNetwork}
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
                                {/* 编译结果快速导入 */}
                                <Alert
                                    message={
                                        <Space>
                                            <RocketOutlined />
                                            <Text strong>快速导入编译结果</Text>
                                        </Space>
                                    }
                                    description={
                                        <Space direction="vertical" style={{ width: '100%' }}>
                                            <Text>
                                                支持上传主流编译器的 JSON 输出文件，系统将自动识别并提取 ABI 和 Bytecode：
                                            </Text>
                                            <ul style={{ marginBottom: 8, paddingLeft: 20 }}>
                                                <li><Text strong>Hardhat：</Text><Text code>artifacts/contracts/YourContract.sol/YourContract.json</Text></li>
                                                <li><Text strong>Remix：</Text>编译后导出的 JSON 文件</li>
                                                <li><Text strong>Truffle：</Text><Text code>build/contracts/YourContract.json</Text></li>
                                            </ul>
                                            <Upload
                                                accept=".json"
                                                beforeUpload={handleHardhatArtifactUpload}
                                                showUploadList={false}
                                            >
                                                <Button type="primary" icon={<CloudUploadOutlined />} size="large">
                                                    上传编译结果文件 (.json)
                                                </Button>
                                            </Upload>
                                        </Space>
                                    }
                                    type="info"
                                    showIcon
                                    style={{ marginBottom: 16 }}
                                />

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
                                            <p>请使用 Hardhat、Remix、Truffle 或其他工具编译您的合约，然后将编译结果上传到这里。</p>
                                            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                                                <li><Text strong>推荐：</Text>直接上传编译器输出的 JSON 文件，自动提取所有信息（支持 Hardhat、Remix、Truffle）</li>
                                                <li>ABI 和 Bytecode 是部署合约的必需项</li>
                                                <li>Solidity 源代码是可选的，仅用于存档和查看</li>
                                                <li>支持手动输入或分别上传文件</li>
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
                                        placeholder="请选择用于部署的账户（需要有私钥）"
                                        onChange={(value) => {
                                            const account = accountList.find(a => a.id === value);
                                            setSelectedAccount(account || null);
                                            
                                            // 自动选择账户默认的网络
                                            if (account && account.network_id) {
                                                const network = networkList.find(n => n.id === account.network_id);
                                                if (network) {
                                                    setSelectedNetwork(network);
                                                    form.setFieldValue('networkId', network.id);
                                                }
                                            }
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

                                <Form.Item
                                    name="networkId"
                                    label="部署网络"
                                    rules={[{ required: true, message: '请选择部署网络' }]}
                                >
                                    <Select 
                                        placeholder="请选择要部署到的网络"
                                        onChange={(value) => {
                                            const network = networkList.find(n => n.id === value);
                                            setSelectedNetwork(network || null);
                                        }}
                                    >
                                        {networkList
                                            .filter(network => network.is_enable)
                                            .map(network => (
                                                <Option key={network.id} value={network.id}>
                                                    <Space>
                                                        <LinkOutlined />
                                                        {network.name}
                                                        <Text type="secondary">
                                                            (Chain ID: {network.chain_id})
                                                        </Text>
                                                        {network.is_testnet ? (
                                                            <Tag color="orange">测试网</Tag>
                                                        ) : (
                                                            <Tag color="blue">主网</Tag>
                                                        )}
                                                    </Space>
                                                </Option>
                                            ))}
                                    </Select>
                                </Form.Item>

                                <Alert
                                    message="部署说明"
                                    description="选择账户后会自动选择该账户的默认网络，您也可以手动更改网络。账户可以跨网络使用，请确保账户在目标网络上有足够的余额支付 gas 费用。"
                                    type="info"
                                    showIcon
                                    style={{ marginBottom: 16 }}
                                />

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

