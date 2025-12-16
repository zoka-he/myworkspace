import { useState, useEffect, useCallback } from 'react';
import fetch from '@/src/fetch';
import { 
    Button, Input, Space, Table, message, Tag, Modal, Form, 
    Select, Card, Row, Col, Statistic, Upload, Tabs, 
    Typography, Spin, Tooltip, Badge, Alert, InputNumber,
    Image, Divider, Checkbox
} from 'antd';
import { 
    ExclamationCircleFilled, CopyOutlined, PlusOutlined, 
    EditOutlined, DeleteOutlined, EyeOutlined, RocketOutlined,
    FileTextOutlined, CloudUploadOutlined, PictureOutlined,
    CheckCircleOutlined, SyncOutlined, WalletOutlined,
    LinkOutlined, GiftOutlined, AppstoreOutlined, SendOutlined
} from '@ant-design/icons';
import { ethers } from 'ethers';
import confirm from "antd/es/modal/confirm";
import { IEthAccount } from '../../../types/IEthAccount';
import { IContract } from '../../../types/IContract';
import QueryBar from '@/src/components/queryBar';
import usePagination from '@/src/utils/hooks/usePagination';
import copyToClip from '@/src/utils/common/copy';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import NFTTxModal from './nftTxModal';

const { Column } = Table;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;

// NFT接口定义
interface INFT {
    id?: number;
    contract_id: number;
    contract_address: string;
    token_id: string;
    owner_address: string;
    minter_address: string;
    minter_account_id?: number;
    metadata_uri?: string;
    name?: string;
    description?: string;
    image_url?: string;
    attributes?: string; // JSON string
    transaction_hash?: string;
    network_id?: number;
    network?: string;
    chain_id?: number;
    status: 'pending' | 'minted' | 'failed';
    remark?: string;
    create_time?: string;
    update_time?: string;
}

// ERC-721 标准ABI (简化版，只包含mint相关)
const ERC721_ABI = [
    "function mint(address to, uint256 tokenId) public",
    "function safeMint(address to, uint256 tokenId) public",
    "function mintWithURI(address to, uint256 tokenId, string memory uri) public",
    "function ownerOf(uint256 tokenId) public view returns (address)",
    "function tokenURI(uint256 tokenId) public view returns (string memory)",
    "function balanceOf(address owner) public view returns (uint256)",
    "function totalSupply() public view returns (uint256)"
];

export default function NFTManage() {
    const [userParams, setUserParams] = useState({});
    const [listData, updateListData] = useState<INFT[]>([]);
    const [contractList, setContractList] = useState<IContract[]>([]);
    const [accountList, setAccountList] = useState<IEthAccount[]>([]);
    const [networkList, setNetworkList] = useState<any[]>([]);
    const [spinning, updateSpinning] = useState(false);
    const [isMintModalVisible, setIsMintModalVisible] = useState(false);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
    const [currentNFT, setCurrentNFT] = useState<INFT | null>(null);
    const [transferNFT, setTransferNFT] = useState<INFT | null>(null);
    const [minting, setMinting] = useState(false);
    const [isEditingNFT, setIsEditingNFT] = useState(false);
    const [updatingNFT, setUpdatingNFT] = useState(false);
    const [fetchingOnchainNFTInfo, setFetchingOnchainNFTInfo] = useState(false);
    const [form] = Form.useForm();
    const [detailForm] = Form.useForm();

    // 导入相关状态
    const [isImportModalVisible, setIsImportModalVisible] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importForm] = Form.useForm();
    const pagination = usePagination();

    // 铸造相关状态
    const [selectedContract, setSelectedContract] = useState<IContract | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<IEthAccount | null>(null);
    const [importContract, setImportContract] = useState<IContract | null>(null);
    const [metadataJson, setMetadataJson] = useState('');
    const [autoTokenId, setAutoTokenId] = useState(true);
    const [useExistingAccount, setUseExistingAccount] = useState(false);
    const [useExistingOwnerAccount, setUseExistingOwnerAccount] = useState(false);
    const [fetchingOnchainInfo, setFetchingOnchainInfo] = useState(false);
    const [priceUnit, setPriceUnit] = useState<'ETH' | 'Gwei' | 'wei'>('ETH');

    useEffect(() => {
        onQuery();
        loadContracts();
        loadAccounts();
        loadNetworks();
    }, []);

    useEffect(() => {
        onQuery();
    }, [userParams, pagination.page, pagination.pageSize]);

    async function loadContracts() {
        try {
            // 加载已部署的合约
            // @ts-ignore
            const { data } = await fetch.get('/api/eth/contract', { 
                params: { 
                    page: 1, 
                    limit: 1000,
                    status: 'deployed' // 只显示已部署的合约
                } 
            });
            setContractList(data || []);
        } catch (e: any) {
            console.error('加载合约列表失败:', e);
            message.error('加载合约列表失败');
        }
    }

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
            const { data } = await fetch.get('/api/eth/network', { 
                params: { page: 1, limit: 1000, is_enable: true } 
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

            // 更新列表数据
            await Promise.all([
                loadNetworks(),
                loadAccounts(),
                loadContracts()
            ]);

            const params: any = {
                ...userParams,
                page: pagination.page,
                limit: pagination.pageSize
            }

            // TODO: 创建NFT API接口
            // @ts-ignore
            const { data, count } = await fetch.get('/api/eth/nft', { params })

            updateListData(data || []);
            pagination.setTotal(count || 0);
        } catch (e: any) {
            console.error(e);
            // message.error(e.message || '查询失败');
            // 暂时mock数据
            updateListData([]);
            pagination.setTotal(0);
        } finally {
            updateSpinning(false);
        }
    }

    // 铸造NFT
    const mintNFT = useCallback(async () => {
        if (!selectedContract) {
            message.error('请选择NFT合约');
            return;
        }

        if (!selectedAccount || !selectedAccount.private_key) {
            message.error('请选择有私钥的账户');
            return;
        }

        try {
            const values = await form.validateFields();
            setMinting(true);

            // 获取网络信息
            const network = networkList.find(n => n.id === selectedContract.network_id);
            if (!network) {
                message.error('未找到网络信息');
                setMinting(false);
                return;
            }

            // 创建provider和wallet
            const provider = new ethers.JsonRpcProvider(network.rpc_url);
            const wallet = new ethers.Wallet(selectedAccount.private_key, provider);

            // 解析合约ABI
            let contractAbi;
            try {
                contractAbi = JSON.parse(selectedContract.abi || '[]');
            } catch (e) {
                message.error('合约ABI格式错误');
                setMinting(false);
                return;
            }

            // 创建合约实例
            const contract = new ethers.Contract(
                selectedContract.address!,
                contractAbi,
                wallet
            );

            // 准备元数据
            let metadata: any = {};
            if (metadataJson) {
                try {
                    metadata = JSON.parse(metadataJson);
                } catch (e) {
                    // 使用表单数据构建元数据
                    metadata = {
                        name: values.nftName,
                        description: values.description,
                        image: values.imageUrl,
                    };

                    if (values.attributes) {
                        try {
                            metadata.attributes = JSON.parse(values.attributes);
                        } catch (e) {
                            console.error('属性JSON解析失败');
                        }
                    }
                }
            } else {
                metadata = {
                    name: values.nftName,
                    description: values.description,
                    image: values.imageUrl,
                };

                if (values.attributes) {
                    try {
                        metadata.attributes = JSON.parse(values.attributes);
                    } catch (e) {
                        console.error('属性JSON解析失败');
                    }
                }
            }

            // 获取tokenId
            let tokenId = values.tokenId;
            if (autoTokenId) {
                // 自动获取下一个可用的tokenId
                try {
                    const totalSupply = await contract.totalSupply();
                    tokenId = totalSupply.toString();
                } catch (e) {
                    console.error('获取totalSupply失败，使用时间戳作为tokenId');
                    tokenId = Date.now().toString();
                }
            }

            message.loading({ content: '正在铸造NFT...', key: 'mint' });

            let tx;
            let metadataUri = values.metadataUri || '';

            // 准备交易选项（包括发送以太币）
            const txOptions: any = {};
            let hasPriceValue = false;
            if (values.mintPrice) {
                const priceValue = values.mintPrice.toString().trim();
                console.log('价格解析:', { priceValue, priceUnit, mintPrice: values.mintPrice });
                if (priceValue && (priceUnit === 'wei' ? priceValue !== '0' : parseFloat(priceValue) > 0)) {
                    try {
                        let valueInWei: bigint;
                        
                        // 根据选择的单位转换价格
                        switch (priceUnit) {
                            case 'ETH':
                                valueInWei = ethers.parseEther(priceValue);
                                break;
                            case 'Gwei':
                                valueInWei = ethers.parseUnits(priceValue, 'gwei');
                                break;
                            case 'wei':
                                // wei 是整数，直接转换为 BigInt
                                if (!/^\d+$/.test(priceValue)) {
                                    throw new Error('wei 必须是正整数');
                                }
                                valueInWei = BigInt(priceValue);
                                break;
                            default:
                                valueInWei = ethers.parseEther(priceValue);
                        }
                        
                        txOptions.value = valueInWei;
                        hasPriceValue = true;
                        console.log('价格解析成功:', { valueInWei: valueInWei.toString(), hasPriceValue });
                        message.info({ content: `将发送 ${priceValue} ${priceUnit}`, key: 'mint-price', duration: 3 });
                    } catch (e: any) {
                        console.error('解析价格失败:', e);
                        message.warning({ content: `价格格式错误: ${e.message || '无效的数值'}，将不发送以太币`, key: 'mint-price', duration: 3 });
                    }
                } else {
                    console.log('价格值为空或0:', { priceValue, priceUnit });
                }
            } else {
                console.log('没有输入价格:', { mintPrice: values.mintPrice });
            }

            // 尝试不同的mint方法（优先检测新合约的方法）
            const hasMintWithMetadata = contractAbi.some((item: any) => 
                item.type === 'function' && item.name === 'mintWithMetadata'
            );
            const hasMintWithPrice = contractAbi.some((item: any) => 
                item.type === 'function' && item.name === 'mintWithPrice'
            );
            const hasMintWithURI = contractAbi.some((item: any) => 
                item.type === 'function' && item.name === 'mintWithURI'
            );
            const hasSafeMint = contractAbi.some((item: any) => 
                item.type === 'function' && item.name === 'safeMint'
            );
            const hasMint = contractAbi.some((item: any) => 
                item.type === 'function' && item.name === 'mint'
            );

            try {
                // 先检查是否有用户输入的价格
                let userHasValue = hasPriceValue && txOptions.value !== undefined && txOptions.value > BigInt(0);
                
                console.log('初始 Value 检查:', {
                    hasPriceValue,
                    userHasValue,
                    txOptionsValue: txOptions.value?.toString(),
                    txOptions: Object.keys(txOptions)
                });
                
                // 确定要调用的方法（优先使用新合约的方法）
                let targetMethod: any = null;
                let methodName = '';
                let methodParams: any[] = [];
                
                // 检查是否有元数据需要传递
                const hasMetadata = !!(values.nftName || values.description || values.imageUrl || values.attributes);
                
                if (hasMintWithMetadata) {
                    // 新合约的 mintWithMetadata 方法
                    targetMethod = contractAbi.find((item: any) => 
                        item.type === 'function' && item.name === 'mintWithMetadata'
                    );
                    methodName = 'mintWithMetadata';
                    
                    // 对于新合约，价格作为参数传递，同时 msg.value 必须 >= 价格
                    // 如果用户输入了价格，使用用户输入；否则使用0表示使用默认价格（mintPrice）
                    let priceParam: bigint;
                    if (userHasValue) {
                        priceParam = txOptions.value;
                    } else {
                        // 如果没有输入价格，尝试获取合约的默认价格
                        try {
                            const defaultPrice = await contract.mintPrice();
                            priceParam = defaultPrice;
                            // 同时设置 txOptions.value 为默认价格
                            txOptions.value = defaultPrice;
                            hasPriceValue = true;
                        } catch (e) {
                            // 如果无法获取默认价格，使用0
                            priceParam = BigInt(0);
                        }
                    }
                    
                    // 准备属性数组
                    let attributes: any[] = [];
                    if (values.attributes) {
                        try {
                            attributes = JSON.parse(values.attributes);
                        } catch (e) {
                            console.warn('属性JSON解析失败，使用空数组');
                        }
                    }
                    
                    // mintWithMetadata(address _to, string _tokenURI, uint256 _price, string _name, string _image, string _description, Attribute[] _attributes)
                    methodParams = [
                        values.recipientAddress,
                        metadataUri || '',
                        priceParam,
                        values.nftName || '',
                        values.imageUrl || '',
                        values.description || '',
                        attributes.map((attr: any) => ({
                            trait_type: attr.trait_type || attr.name || '',
                            value: attr.value || ''
                        }))
                    ];
                    
                    console.debug('mintWithMetadata', methodParams);
                    
                } else if (hasMintWithPrice) {
                    // 新合约的 mintWithPrice 方法
                    targetMethod = contractAbi.find((item: any) => 
                        item.type === 'function' && item.name === 'mintWithPrice'
                    );
                    methodName = 'mintWithPrice';
                    
                    // 对于新合约，价格作为参数传递，同时 msg.value 必须 >= 价格
                    let priceParam: bigint;
                    if (userHasValue) {
                        priceParam = txOptions.value;
                    } else {
                        // 如果没有输入价格，尝试获取合约的默认价格
                        try {
                            const defaultPrice = await contract.mintPrice();
                            priceParam = defaultPrice;
                            txOptions.value = defaultPrice;
                            hasPriceValue = true;
                            userHasValue = true;
                        } catch (e) {
                            priceParam = BigInt(0);
                        }
                    }
                    
                    // mintWithPrice(address _to, string _tokenURI, uint256 _price)
                    methodParams = [values.recipientAddress, metadataUri || '', priceParam];
                    
                    console.debug('mintWithPrice', methodParams);
                    
                } else if (hasMint) {
                    // 检查 mint 方法的签名
                    targetMethod = contractAbi.find((item: any) => 
                        item.type === 'function' && item.name === 'mint'
                    );
                    
                    if (targetMethod && targetMethod.inputs) {
                        const inputCount = targetMethod.inputs.length;
                        
                        if (inputCount === 2 && targetMethod.inputs[1].type === 'string') {
                            // 新合约的 mint(address _to, string _tokenURI) - Token ID自动生成
                            methodName = 'mint';
                            methodParams = [values.recipientAddress, metadataUri || ''];
                            
                            // 对于新合约的 mint 方法，如果没有输入价格，需要获取默认价格
                            if (!userHasValue) {
                                try {
                                    const defaultPrice = await contract.mintPrice();
                                    txOptions.value = defaultPrice;
                                    hasPriceValue = true;
                                    userHasValue = true;
                                    console.log('使用合约默认价格:', defaultPrice.toString());
                                } catch (e) {
                                    console.warn('无法获取合约默认价格，将使用0');
                                }
                            }
                            
                            console.debug('mint (new contract)', methodParams);
                        } else if (inputCount === 2 && targetMethod.inputs[1].type === 'uint256') {
                            // 旧合约的 mint(address _to, uint256 _tokenId)
                            methodName = 'mint';
                            methodParams = [values.recipientAddress, tokenId];
                            console.debug('mint (old contract)', methodParams);
                        } else {
                            // 默认使用旧合约的方式
                            methodName = 'mint';
                            methodParams = [values.recipientAddress, tokenId];
                            console.debug('mint (default)', methodParams);
                        }
                    } else {
                        methodName = 'mint';
                        methodParams = [values.recipientAddress, tokenId];
                        console.debug('mint (fallback)', methodParams);
                    }
                    
                } else if (metadataUri && hasMintWithURI) {
                    // 旧合约的 mintWithURI
                    targetMethod = contractAbi.find((item: any) => 
                        item.type === 'function' && item.name === 'mintWithURI'
                    );
                    methodName = 'mintWithURI';
                    methodParams = [values.recipientAddress, tokenId, metadataUri];
                    console.debug('mintWithURI', methodParams);
                    
                } else if (hasSafeMint) {
                    // safeMint 方法签名可能是 (address, uint256) 或 (address, string)
                    targetMethod = contractAbi.find((item: any) => 
                        item.type === 'function' && item.name === 'safeMint'
                    );
                    methodName = 'safeMint';
                    
                    if (targetMethod && targetMethod.inputs && targetMethod.inputs.length === 2) {
                        // 如果第二个参数是 string，说明是 safeMint(address, string)
                        if (targetMethod.inputs[1].type === 'string') {
                            methodParams = [values.recipientAddress, metadataUri || ''];
                        } else {
                            // 否则是 safeMint(address, uint256)
                            methodParams = [values.recipientAddress, tokenId];
                        }
                    } else {
                        methodParams = [values.recipientAddress, tokenId];
                    }
                    console.debug('safeMint', methodParams);
                    
                } else {
                    throw new Error('合约没有可用的mint方法');
                }
                
                // 重新检查最终的 hasValue（可能在方法选择时被更新）
                const hasValue = hasPriceValue && txOptions.value !== undefined && txOptions.value > BigInt(0);
                
                console.log('最终 Value 检查:', {
                    hasPriceValue,
                    hasValue,
                    txOptionsValue: txOptions.value?.toString()
                });
                
                // 检查方法是否是 payable（兼容新旧 ABI 格式）
                // 新合约的所有公开铸造方法都是 payable
                const isPayable = targetMethod ? (
                    targetMethod.stateMutability === 'payable' || 
                    targetMethod.payable === true ||
                    methodName === 'mintWithMetadata' ||
                    methodName === 'mintWithPrice' ||
                    (methodName === 'mint' && methodParams.length === 2 && typeof methodParams[1] === 'string')
                ) : false;
                
                // 调试信息
                console.log('方法信息:', {
                    methodName,
                    hasValue,
                    isPayable,
                    stateMutability: targetMethod?.stateMutability,
                    payable: targetMethod?.payable,
                    hasTargetMethod: !!targetMethod,
                    txOptionsValue: txOptions.value?.toString(),
                    fullTargetMethod: targetMethod
                });
                
                // 关键检查：如果方法不是 payable 但传递了 value，立即阻止
                if (hasValue && !isPayable) {
                    const stateMutability = targetMethod?.stateMutability || 'nonpayable';
                    const errorMsg = `错误：合约的 ${methodName} 方法不是 payable（当前状态: ${stateMutability}），无法接收以太币。\n\n解决方案：\n1. 移除铸造价格字段中的值\n2. 或者使用支持 payable 的铸造方法`;
                    console.error('PAYABLE 检查失败:', errorMsg, { 
                        targetMethod, 
                        isPayable, 
                        hasValue,
                        stateMutability,
                        txOptionsValue: txOptions.value?.toString()
                    });
                    message.error({ 
                        content: errorMsg, 
                        key: 'mint-error',
                        duration: 10 
                    });
                    setMinting(false);
                    throw new Error(errorMsg);
                }
                
                // 只在有 value 且方法是 payable 时才传递 txOptions
                // 确保如果方法不是 payable，callOptions 一定是 undefined
                const callOptions = (hasValue && isPayable) ? txOptions : undefined;
                
                console.log('调用选项:', {
                    hasValue,
                    isPayable,
                    willPassValue: !!(callOptions && callOptions.value),
                    callOptionsValue: callOptions?.value?.toString()
                });
                
                // 最终安全检查：确保不会向非 payable 方法传递 value
                if (callOptions && callOptions.value && !isPayable) {
                    const errorMsg = `安全检查失败：检测到向非 payable 方法传递 value。请移除铸造价格。`;
                    console.error(errorMsg);
                    message.error({ 
                        content: errorMsg, 
                        key: 'mint-error',
                        duration: 10 
                    });
                    setMinting(false);
                    throw new Error(errorMsg);
                }
                
                // 关键修复：如果用户输入了价格，先验证方法是否真的支持 payable
                // 对于新合约的 mintWithMetadata 和 mintWithPrice，需要特殊处理
                let payableVerified = false;
                if (hasValue && isPayable) {
                    console.log('验证：检测到价格输入且 ABI 显示 payable，先验证方法是否真的支持 payable');
                    
                    // 对于新合约的方法（mintWithMetadata, mintWithPrice），价格是参数的一部分
                    // 这些方法需要 msg.value >= 价格参数，所以验证时必须同时传递 value
                    const isNewContractMethod = methodName === 'mintWithMetadata' || methodName === 'mintWithPrice';
                    
                    if (isNewContractMethod) {
                        // 新合约方法：直接使用带 value 的调用验证（因为价格是参数，必须传递 value）
                        console.log('新合约方法：直接验证（带 value，因为价格是参数）');
                        try {
                            await contract[methodName].estimateGas(...methodParams, callOptions);
                            console.log('✓ 新合约方法验证通过');
                            payableVerified = true;
                        } catch (payableTestError: any) {
                            console.error('✗ 新合约方法验证失败', payableTestError);
                            // 检查是否是支付不足的错误
                            if (payableTestError.reason && payableTestError.reason.includes('Insufficient payment')) {
                                const errorMsg = `支付不足：合约要求支付至少 ${txOptions.value.toString()} wei，但可能合约的默认价格更高。\n\n请检查合约的 mintPrice 设置，或增加铸造价格。`;
                                message.error({ 
                                    content: errorMsg, 
                                    key: 'mint-error',
                                    duration: 10 
                                });
                                setMinting(false);
                                throw new Error(errorMsg);
                            }
                            throw payableTestError;
                        }
                    } else {
                        // 旧合约方法：先不带 value 验证，再带 value 验证
                        try {
                            console.log('步骤1：验证方法存在（不带 value）');
                            await contract[methodName].estimateGas(...methodParams);
                            console.log('✓ 方法存在，参数正确');
                            
                            console.log('步骤2：验证方法是否支持 payable（带 value）');
                            try {
                                await contract[methodName].estimateGas(...methodParams, callOptions);
                                console.log('✓ 方法支持 payable，验证通过');
                                payableVerified = true;
                            } catch (payableTestError: any) {
                                console.error('✗ 方法不支持 payable（ABI 与实际合约不匹配）', payableTestError);
                                const errorMsg = '检测到 ABI 显示方法是 payable，但实际合约不支持接收以太币。\n\n可能原因：\n1. 合约代码与 ABI 不匹配\n2. 该方法实际上不是 payable\n\n解决方案：请移除铸造价格字段中的值后重试。';
                                message.error({ 
                                    content: errorMsg, 
                                    key: 'mint-error',
                                    duration: 10 
                                });
                                setMinting(false);
                                throw new Error(errorMsg);
                            }
                        } catch (verifyError: any) {
                            console.warn('验证失败：方法可能不存在或参数错误', verifyError);
                            throw verifyError;
                        }
                    }
                }
                
                // 执行实际的 gas 估算（如果已经验证过 payable，这里应该会成功）
                // 如果没有验证（没有输入价格或方法不是 payable），正常执行
                try {
                    if (callOptions && callOptions.value && payableVerified) {
                        // 已经验证过，直接使用已验证的调用
                        console.log('使用已验证的 value 调用 estimateGas:', callOptions.value.toString());
                        await contract[methodName].estimateGas(...methodParams, callOptions);
                    } else if (callOptions && callOptions.value && !payableVerified) {
                        // 有 value 但没有验证（不应该发生，但为了安全）
                        console.log('警告：有 value 但未验证，尝试调用:', callOptions.value.toString());
                        await contract[methodName].estimateGas(...methodParams, callOptions);
                    } else {
                        console.log('不使用 value 调用 estimateGas');
                        await contract[methodName].estimateGas(...methodParams);
                    }
                } catch (estimateError: any) {
                    console.error('Gas 估算失败:', estimateError);
                    // 解析错误信息
                    let errorMsg = '调用合约方法失败';
                    if (estimateError.reason) {
                        errorMsg = estimateError.reason;
                    } else if (estimateError.message) {
                        errorMsg = estimateError.message;
                    } else if (estimateError.data) {
                        // 尝试解析自定义错误
                        errorMsg = `执行回退: ${estimateError.data}`;
                    }
                    
                    // 检查是否是权限问题
                    if (errorMsg.includes('onlyOwner') || errorMsg.includes('Ownable')) {
                        setMinting(false);
                        throw new Error('调用失败：当前账户不是合约所有者，无法执行此操作。请使用合约所有者账户进行铸造。');
                    }
                    
                    // 关键修复：如果传递了 value 且执行回退，即使 ABI 显示是 payable，也可能是实际合约不支持
                    // 这是因为 ABI 可能与实际合约代码不匹配
                    if (hasValue && (errorMsg.includes('revert') || errorMsg.includes('reverted') || estimateError.code === 'CALL_EXCEPTION')) {
                        console.warn('检测到执行回退，可能是 payable 问题（ABI 与实际合约不匹配）');
                        setMinting(false);
                        throw new Error('调用失败：该方法不支持接收以太币（执行回退）。\n\n可能原因：\n1. 合约实际代码与 ABI 不匹配\n2. 该方法实际上不是 payable\n\n解决方案：请移除铸造价格后重试。');
                    }
                    
                    // 检查是否是 payable 问题（即使之前检查过，这里也要再次检查）
                    if (hasValue && !isPayable) {
                        setMinting(false);
                        throw new Error('调用失败：该方法不支持接收以太币。请移除铸造价格。');
                    }
                    
                    setMinting(false);
                    throw new Error(`调用合约方法失败: ${errorMsg}`);
                }
                
                // 调用合约方法
                if (callOptions) {
                    tx = await contract[methodName](...methodParams, callOptions);
                } else {
                    tx = await contract[methodName](...methodParams);
                }

                const receipt = await tx.wait();

                // 对于新合约，Token ID是自动生成的，需要从交易事件或合约中获取
                let finalTokenId = tokenId;
                if (methodName === 'mintWithMetadata' || methodName === 'mintWithPrice' || 
                    (methodName === 'mint' && methodParams.length === 2 && typeof methodParams[1] === 'string')) {
                    // 新合约：Token ID自动生成
                    // 方法1：尝试从交易事件中获取
                    try {
                        // 查找 Minted 事件（新合约的事件签名）
                        const mintedEventTopic = ethers.id('Minted(address,uint256,string,uint256)');
                        const mintedEvent = receipt.logs.find((log: any) => {
                            // 检查事件主题
                            return log.topics && log.topics[0] === mintedEventTopic;
                        });
                        
                        if (mintedEvent) {
                            try {
                                // 解析事件（tokenId 在 topics[2] 中，因为它是 indexed）
                                // Minted(address indexed to, uint256 indexed tokenId, string tokenURI, uint256 price)
                                if (mintedEvent.topics && mintedEvent.topics.length >= 3) {
                                    finalTokenId = BigInt(mintedEvent.topics[2]).toString();
                                    console.log('从事件获取 Token ID:', finalTokenId);
                                }
                            } catch (parseError) {
                                console.warn('解析事件失败，尝试使用接口解析:', parseError);
                                // 尝试使用合约接口解析
                                try {
                                    const parsed = contract.interface.parseLog({
                                        topics: mintedEvent.topics,
                                        data: mintedEvent.data
                                    });
                                    if (parsed && parsed.args && parsed.args.tokenId !== undefined) {
                                        finalTokenId = parsed.args.tokenId.toString();
                                        console.log('从解析的事件获取 Token ID:', finalTokenId);
                                    }
                                } catch (e2) {
                                    console.warn('接口解析也失败:', e2);
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('无法从事件获取 Token ID，尝试从合约获取:', e);
                    }
                    
                    // 方法2：如果事件中没有，从合约的 totalSupply 获取
                    if (!finalTokenId || finalTokenId === tokenId || finalTokenId === '0') {
                        try {
                            // 等待一个区块确认，确保状态已更新
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            
                            const totalSupply = await contract.totalSupply();
                            console.log('合约 totalSupply:', totalSupply.toString());
                            
                            // totalSupply 是下一个要使用的ID，所以刚铸造的ID是 totalSupply - 1
                            if (totalSupply > BigInt(0)) {
                                finalTokenId = (totalSupply - BigInt(1)).toString();
                                console.log('从 totalSupply 获取 Token ID:', finalTokenId);
                            } else {
                                // 如果 totalSupply 是 0，说明这是第一个，ID 应该是 0
                                finalTokenId = '0';
                                console.log('使用默认 Token ID: 0');
                            }
                        } catch (e) {
                            console.warn('无法获取新合约的 Token ID，使用原始值:', tokenId, e);
                            // 如果都失败了，使用时间戳作为后备
                            finalTokenId = Date.now().toString();
                            console.warn('使用时间戳作为后备 Token ID:', finalTokenId);
                        }
                    }
                }

                // 保存NFT信息到数据库
                const nftData: any = {
                    contract_id: selectedContract.id,
                    contract_address: selectedContract.address,
                    token_id: finalTokenId,
                    owner_address: values.recipientAddress,
                    minter_address: selectedAccount.address,
                    minter_account_id: selectedAccount.id,
                    metadata_uri: metadataUri,
                    name: metadata.name || values.nftName,
                    description: metadata.description || values.description,
                    image_url: metadata.image || values.imageUrl,
                    attributes: JSON.stringify(metadata.attributes || {}),
                    transaction_hash: tx.hash,
                    network_id: selectedContract.network_id,
                    network: network.name,
                    chain_id: network.chain_id,
                    status: 'minted',
                    remark: values.remark || ''
                };

                // TODO: 创建NFT保存API
                await fetch.post('/api/eth/nft', nftData);

                message.success({ content: '铸造成功', key: 'mint' });
                setIsMintModalVisible(false);
                onQuery();
                
                // 重置表单
                form.resetFields();
                setMetadataJson('');
                setSelectedContract(null);
                setSelectedAccount(null);
                setUseExistingAccount(false);
                setPriceUnit('ETH');

            } catch (mintError: any) {
                console.error('铸造失败:', mintError);
                throw mintError;
            }

        } catch (e: any) {
            console.error('铸造失败:', e);
            message.error({ content: '铸造失败: ' + e.message, key: 'mint' });
        } finally {
            setMinting(false);
        }
    }, [selectedContract, selectedAccount, form, metadataJson, autoTokenId, networkList, onQuery, priceUnit]);

    // 导入链上已存在的 NFT
    const importNFT = useCallback(async () => {
        if (!importContract) {
            message.error('请选择NFT合约');
            return;
        }

        try {
            const values = await importForm.validateFields();
            setImporting(true);

            // 获取网络信息（优先使用用户选择的 network_id）
            const targetNetworkId = values.networkId || importContract.network_id;
            const network = networkList.find(n => n.id === targetNetworkId);
            if (!network) {
                message.error('未找到网络信息');
                setImporting(false);
                return;
            }

            // 创建 provider（只读，无需私钥）
            const provider = new ethers.JsonRpcProvider(network.rpc_url);

            // 解析合约 ABI
            let contractAbi;
            try {
                contractAbi = JSON.parse(importContract.abi || '[]');
            } catch (e) {
                message.error('合约ABI格式错误');
                setImporting(false);
                return;
            }

            const contract = new ethers.Contract(
                importContract.address!,
                contractAbi,
                provider
            );

            const tokenId = values.tokenId;

            // 尝试从链上读取 ownerOf 和 tokenURI
            let ownerAddress: string | undefined = values.ownerAddress;
            let metadataUri: string | undefined = values.metadataUri;

            const hasOwnerOf = contractAbi.some((item: any) =>
                item.type === 'function' && item.name === 'ownerOf'
            );
            const hasTokenURI = contractAbi.some((item: any) =>
                item.type === 'function' && item.name === 'tokenURI'
            );

            if (hasOwnerOf) {
                try {
                    ownerAddress = await contract.ownerOf(tokenId);
                } catch (e) {
                    console.warn('读取 ownerOf 失败，将使用用户输入的地址:', e);
                }
            }

            if (!ownerAddress) {
                message.error('无法获取持有者地址，请手动填写');
                setImporting(false);
                return;
            }

            if (!metadataUri && hasTokenURI) {
                try {
                    metadataUri = await contract.tokenURI(tokenId);
                } catch (e) {
                    console.warn('读取 tokenURI 失败，元数据URI留空:', e);
                }
            }

            const nftData: any = {
                contract_id: importContract.id,
                contract_address: importContract.address,
                token_id: tokenId,
                owner_address: ownerAddress,
                // 导入的 NFT 无法准确获知铸造者，这里先使用当前持有者地址占位
                minter_address: ownerAddress,
                minter_account_id: null,
                metadata_uri: metadataUri || null,
                name: null,
                description: null,
                image_url: null,
                attributes: null,
                transaction_hash: null,
                network_id: targetNetworkId,
                network: network.name,
                chain_id: network.chain_id,
                status: 'minted',
                remark: values.remark || 'Imported from on-chain NFT'
            };

            await fetch.post('/api/eth/nft', nftData);

            message.success('导入成功');
            setIsImportModalVisible(false);
            importForm.resetFields();
            setImportContract(null);
            onQuery();
        } catch (e: any) {
            console.error('导入NFT失败:', e);
            if (e?.error?.response?.data?.error) {
                message.error(`导入失败: ${e.error.response.data.error}`);
            } else {
                message.error(`导入失败: ${e.message || '未知错误'}`);
            }
        } finally {
            setImporting(false);
        }
    }, [importContract, importForm, networkList, onQuery]);

    // 从链上获取 NFT 信息并填充表单
    const fetchOnchainNFTInfo = useCallback(async () => {
        if (!importContract) {
            message.error('请先选择NFT合约');
            return;
        }

        const { networkId, tokenId } = importForm.getFieldsValue(['networkId', 'tokenId']);
        if (!networkId || !tokenId) {
            message.error('请先选择网络并输入 Token ID');
            return;
        }

        try {
            setFetchingOnchainInfo(true);

            const network = networkList.find((n: any) => n.id === networkId);
            if (!network) {
                message.error('未找到网络信息');
                return;
            }

            // 创建只读 provider
            const provider = new ethers.JsonRpcProvider(network.rpc_url);

            // 解析 ABI
            let contractAbi;
            try {
                contractAbi = JSON.parse(importContract.abi || '[]');
            } catch (e) {
                message.error('合约ABI格式错误');
                return;
            }

            const contract = new ethers.Contract(
                importContract.address!,
                contractAbi,
                provider
            );

            let ownerAddress: string | undefined;
            let metadataUri: string | undefined;

            const hasOwnerOf = contractAbi.some((item: any) =>
                item.type === 'function' && item.name === 'ownerOf'
            );
            const hasTokenURI = contractAbi.some((item: any) =>
                item.type === 'function' && item.name === 'tokenURI'
            );

            if (hasOwnerOf) {
                try {
                    ownerAddress = await contract.ownerOf(tokenId);
                } catch (e) {
                    console.warn('读取 ownerOf 失败:', e);
                }
            }

            if (hasTokenURI) {
                try {
                    metadataUri = await contract.tokenURI(tokenId);
                } catch (e) {
                    console.warn('读取 tokenURI 失败:', e);
                }
            }

            const nextValues: any = {};
            const currentOwner = importForm.getFieldValue('ownerAddress');
            const currentMetadata = importForm.getFieldValue('metadataUri');

            if (ownerAddress && !currentOwner) {
                nextValues.ownerAddress = ownerAddress;
            }
            if (metadataUri && !currentMetadata) {
                nextValues.metadataUri = metadataUri;
            }

            if (Object.keys(nextValues).length > 0) {
                importForm.setFieldsValue(nextValues);
                message.success('已从链上获取NFT基础信息');
            } else {
                message.info('未能获取到新的链上信息，或表单中已存在对应值');
            }
        } catch (e: any) {
            console.error('获取链上NFT信息失败:', e);
            message.error(`获取链上信息失败: ${e.message || '未知错误'}`);
        } finally {
            setFetchingOnchainInfo(false);
        }
    }, [importContract, importForm, networkList]);

    function onMintNFT() {
        form.resetFields();
        setMetadataJson('');
        setSelectedContract(null);
        setSelectedAccount(null);
        setAutoTokenId(true);
        setUseExistingAccount(false);
        setPriceUnit('ETH');
        setIsMintModalVisible(true);
    }

    function onCancelMintModal() {
        setIsMintModalVisible(false);
    }

    // 初始化详情表单数据
    const initDetailForm = (nft: INFT) => {
        let attributes = '';
        try {
            if (nft.attributes) {
                attributes = JSON.stringify(JSON.parse(nft.attributes), null, 2);
            }
        } catch (e) {
            console.error('解析属性失败:', e);
        }
        detailForm.setFieldsValue({
            name: nft.name || '',
            description: nft.description || '',
            image_url: nft.image_url || '',
            metadata_uri: nft.metadata_uri || '',
            attributes: attributes,
            remark: nft.remark || ''
        });
    };

    function onViewNFT(nft: INFT) {
        setCurrentNFT(nft);
        setIsEditingNFT(false);
        setIsDetailModalVisible(true);
        // 初始化表单数据
        initDetailForm(nft);
    }

    // 切换到编辑模式时，确保表单数据已初始化
    const handleEditNFT = () => {
        if (currentNFT) {
            // 确保表单数据已初始化（使用当前NFT数据）
            initDetailForm(currentNFT);
            setIsEditingNFT(true);
        }
    };

    // 从链上获取NFT最新状态（用于详情/编辑页面）
    const fetchOnchainNFTInfoForDetail = useCallback(async () => {
        if (!currentNFT) {
            message.error('NFT信息缺失');
            return;
        }

        try {
            setFetchingOnchainNFTInfo(true);

            const contract = contractList.find(c => c.id === currentNFT.contract_id);
            if (!contract) {
                message.error('未找到合约信息');
                return;
            }

            const network = networkList.find(n => n.id === contract.network_id);
            if (!network) {
                message.error('未找到网络信息');
                return;
            }

            // 创建只读provider
            const provider = new ethers.JsonRpcProvider(network.rpc_url);

            // 解析合约ABI
            let contractAbi;
            try {
                contractAbi = JSON.parse(contract.abi || '[]');
            } catch (e) {
                message.error('合约ABI格式错误');
                return;
            }

            const contractInstance = new ethers.Contract(
                contract.address!,
                contractAbi,
                provider
            );

            // 从链上读取信息
            let ownerAddress: string | undefined;
            let metadataUri: string | undefined;

            const hasOwnerOf = contractAbi.some((item: any) =>
                item.type === 'function' && item.name === 'ownerOf'
            );
            const hasTokenURI = contractAbi.some((item: any) =>
                item.type === 'function' && item.name === 'tokenURI'
            );

            if (hasOwnerOf) {
                try {
                    ownerAddress = await contractInstance.ownerOf(currentNFT.token_id);
                } catch (e) {
                    console.warn('读取 ownerOf 失败:', e);
                }
            }

            if (hasTokenURI) {
                try {
                    metadataUri = await contractInstance.tokenURI(currentNFT.token_id);
                } catch (e) {
                    console.warn('读取 tokenURI 失败:', e);
                }
            }

            // 更新表单数据（只在编辑模式下更新）
            if (isEditingNFT) {
                const currentValues = detailForm.getFieldsValue();
                const nextValues: any = {};

                // 如果链上的元数据URI与当前不同，更新它
                if (metadataUri && metadataUri !== currentValues.metadata_uri) {
                    nextValues.metadata_uri = metadataUri;
                }

                // 如果链上的所有者与数据库不同，提示用户
                if (ownerAddress && ownerAddress.toLowerCase() !== currentNFT.owner_address.toLowerCase()) {
                    message.warning(`检测到链上所有者已变更: ${ownerAddress}，请手动更新所有者地址`);
                }

                if (Object.keys(nextValues).length > 0) {
                    detailForm.setFieldsValue(nextValues);
                    message.success('已从链上获取NFT信息并更新表单');
                } else {
                    message.info('链上信息与当前表单数据一致');
                }
            } else {
                // 在查看模式下，更新currentNFT并提示
                const updates: any = {};
                if (ownerAddress && ownerAddress.toLowerCase() !== currentNFT.owner_address.toLowerCase()) {
                    updates.owner_address = ownerAddress;
                    message.warning(`检测到链上所有者已变更: ${ownerAddress}`);
                }
                if (metadataUri && metadataUri !== currentNFT.metadata_uri) {
                    updates.metadata_uri = metadataUri;
                }

                if (Object.keys(updates).length > 0) {
                    setCurrentNFT({ ...currentNFT, ...updates });
                    // 同时更新表单数据，以便切换到编辑模式时能使用最新数据
                    initDetailForm({ ...currentNFT, ...updates });
                    message.success('已从链上获取NFT最新状态');
                } else {
                    message.info('链上信息与当前数据一致');
                }
            }
        } catch (e: any) {
            console.error('获取链上NFT信息失败:', e);
            message.error(`获取链上信息失败: ${e.message || '未知错误'}`);
        } finally {
            setFetchingOnchainNFTInfo(false);
        }
    }, [currentNFT, contractList, networkList, isEditingNFT, detailForm]);

    function onDeleteNFT(nft: INFT) {
        confirm({
            title: '删除确认',
            icon: <ExclamationCircleFilled />,
            content: `确定要删除NFT "${nft.name || nft.token_id}" 吗？（注意：这只会删除记录，不会销毁链上的NFT）`,
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            async onOk() {
                try {
                    await fetch.delete('/api/eth/nft', { 
                        params: { id: nft.id } 
                    });
                    message.success('删除成功');
                    onQuery();
                } catch (e: any) {
                    message.error(e.message || '删除失败');
                }
            },
        });
    }

    // 更新NFT信息
    const handleUpdateNFT = async () => {
        if (!currentNFT) {
            message.error('NFT信息缺失');
            return;
        }

        try {
            const values = await detailForm.validateFields();
            setUpdatingNFT(true);

            // 处理属性字段
            let attributes = null;
            if (values.attributes) {
                try {
                    const parsed = JSON.parse(values.attributes);
                    attributes = JSON.stringify(parsed);
                } catch (e) {
                    message.error('属性JSON格式错误');
                    setUpdatingNFT(false);
                    return;
                }
            }

            const updateData: any = {
                id: currentNFT.id,
                name: values.name || null,
                description: values.description || null,
                image_url: values.image_url || null,
                metadata_uri: values.metadata_uri || null,
                attributes: attributes,
                remark: values.remark || null
            };

            await fetch.put('/api/eth/nft', updateData);

            message.success('更新成功');
            setIsEditingNFT(false);
            onQuery(); // 刷新列表
            
            // 更新当前NFT数据
            const updatedNFT = { ...currentNFT, ...updateData };
            setCurrentNFT(updatedNFT);
        } catch (e: any) {
            console.error('更新NFT失败:', e);
            message.error(e.message || '更新失败');
        } finally {
            setUpdatingNFT(false);
        }
    };

    function renderAction(cell: any, row: INFT) {
        return (
            <div className={styles.actionButtons}>
                <Button 
                    size="small" 
                    type="primary" 
                    icon={<EyeOutlined />} 
                    onClick={() => onViewNFT(row)}
                >
                    详情
                </Button>
                <Button 
                    size="small" 
                    icon={<SendOutlined />} 
                    onClick={() => {
                        setTransferNFT(row);
                        setIsTransferModalVisible(true);
                    }}
                >
                    转让
                </Button>
                <Button 
                    size="small" 
                    icon={<CopyOutlined />} 
                    onClick={() => {
                        if (row.contract_address && row.token_id) {
                            copyToClip(`${row.contract_address}:${row.token_id}`);
                            message.success('已复制合约地址和TokenID');
                        }
                    }}
                >
                    复制
                </Button>
                <Button 
                    size="small" 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={() => onDeleteNFT(row)}
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

    function renderStatus(status: string) {
        const statusConfig: any = {
            'pending': { color: 'processing', icon: <SyncOutlined spin />, text: '铸造中' },
            'minted': { color: 'success', icon: <CheckCircleOutlined />, text: '已铸造' },
            'failed': { color: 'error', icon: <ExclamationCircleFilled />, text: '失败' }
        };
        const config = statusConfig[status] || statusConfig.minted;
        return <Tag icon={config.icon} color={config.color}>{config.text}</Tag>;
    }

    function renderNetwork(network: string, row: any) {
        if (row.network_id) {
            const foundNetwork = networkList.find(n => n.id === row.network_id);
            if (foundNetwork) {
                return (
                    <Tag className={styles.networkTag}>
                        {foundNetwork.name} (Chain: {foundNetwork.chain_id})
                    </Tag>
                );
            }
        }
        
        if (!network || !row.chain_id) {
            return <Text type="secondary">-</Text>;
        }
        return <Tag className={styles.networkTag}>{network}({row.chain_id})</Tag>;
    }

    function renderNFTImage(imageUrl: string | undefined) {
        if (!imageUrl) {
            return (
                <div className={styles.noImage}>
                    <PictureOutlined style={{ fontSize: 32, color: '#ccc' }} />
                </div>
            );
        }

        return (
            <Image
                width={60}
                height={60}
                src={imageUrl}
                fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                preview={{
                    mask: <EyeOutlined />
                }}
                style={{ borderRadius: 8, objectFit: 'cover' }}
            />
        );
    }

    // 统计数据
    const totalNFTs = pagination.total;
    const mintedNFTs = listData.filter(n => n.status === 'minted').length;
    const uniqueContracts = new Set(listData.map(n => n.contract_address)).size;
    const uniqueOwners = new Set(listData.map(n => n.owner_address)).size;

    // 渲染NFT详情
    const renderNFTDetail = () => {
        if (!currentNFT) return null;

        let attributes: any[] = [];
        try {
            if (currentNFT.attributes) {
                attributes = JSON.parse(currentNFT.attributes);
            }
        } catch (e) {
            console.error('解析属性失败:', e);
        }

        const contract = contractList.find(c => c.id === currentNFT.contract_id);

        // 如果是编辑模式，显示表单
        if (isEditingNFT) {
            return (
                <Form form={detailForm} layout="vertical">
                    <Alert
                        message="编辑模式"
                        description={
                            <Space>
                                <span>您可以修改NFT的元数据信息。点击"从链上获取"按钮可以获取链上的最新状态。</span>
                                <Button
                                    size="small"
                                    icon={<SyncOutlined />}
                                    onClick={fetchOnchainNFTInfoForDetail}
                                    loading={fetchingOnchainNFTInfo}
                                >
                                    从链上获取
                                </Button>
                            </Space>
                        }
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                    <Row gutter={24}>
                        <Col span={10}>
                            <Form.Item
                                name="image_url"
                                label="图片URL"
                            >
                                <Input 
                                    placeholder="https://..."
                                    prefix={<PictureOutlined />}
                                />
                            </Form.Item>
                            <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.image_url !== currentValues.image_url}>
                                {({ getFieldValue }) => {
                                    const imageUrl = getFieldValue('image_url') || currentNFT.image_url;
                                    return (
                                        <div className={styles.nftImageLarge}>
                                            {imageUrl ? (
                                                <Image
                                                    src={imageUrl}
                                                    alt={getFieldValue('name') || currentNFT.name || 'NFT'}
                                                    style={{ width: '100%', borderRadius: 12 }}
                                                    fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                                                />
                                            ) : (
                                                <div className={styles.noImageLarge}>
                                                    <PictureOutlined style={{ fontSize: 120, color: '#ccc' }} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                }}
                            </Form.Item>
                        </Col>
                        <Col span={14}>
                            <Form.Item
                                name="name"
                                label="NFT名称"
                            >
                                <Input placeholder="请输入NFT名称" />
                            </Form.Item>
                            <Form.Item
                                name="description"
                                label="描述"
                            >
                                <TextArea 
                                    placeholder="请输入NFT描述"
                                    rows={3}
                                />
                            </Form.Item>
                            <Form.Item
                                name="metadata_uri"
                                label="元数据URI"
                            >
                                <Input 
                                    placeholder="ipfs://... 或 https://..."
                                    prefix={<LinkOutlined />}
                                />
                            </Form.Item>
                            <Form.Item
                                name="attributes"
                                label="属性（JSON格式）"
                                tooltip='格式: [{"trait_type":"属性名","value":"属性值"}]'
                            >
                                <TextArea 
                                    placeholder='[{"trait_type":"Background","value":"Blue"}]'
                                    rows={6}
                                    className={styles.codeEditor}
                                />
                            </Form.Item>
                            <Form.Item
                                name="remark"
                                label="备注"
                            >
                                <Input placeholder="备注信息（可选）" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            );
        }

        // 查看模式
        return (
            <div className={styles.nftDetail}>
                <Row gutter={24}>
                    <Col span={10}>
                        <div className={styles.nftImageLarge}>
                            {currentNFT.image_url ? (
                                <Image
                                    src={currentNFT.image_url}
                                    alt={currentNFT.name}
                                    style={{ width: '100%', borderRadius: 12 }}
                                    fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                                />
                            ) : (
                                <div className={styles.noImageLarge}>
                                    <PictureOutlined style={{ fontSize: 120, color: '#ccc' }} />
                                </div>
                            )}
                        </div>
                    </Col>
                    <Col span={14}>
                        <Title level={3}>{currentNFT.name || `Token #${currentNFT.token_id}`}</Title>
                        <Paragraph type="secondary">
                            {currentNFT.description || '暂无描述'}
                        </Paragraph>

                        <Divider />

                        <dl>
                            <dt>Token ID：</dt>
                            <dd><Text code>{currentNFT.token_id}</Text></dd>
                        </dl>
                        <dl>
                            <dt>合约地址：</dt>
                            <dd>
                                <Space>
                                    <Text code>{currentNFT.contract_address}</Text>
                                    <Button 
                                        size="small" 
                                        icon={<CopyOutlined />} 
                                        onClick={() => {
                                            copyToClip(currentNFT.contract_address);
                                            message.success('已复制');
                                        }}
                                    />
                                </Space>
                            </dd>
                        </dl>
                        {contract && (
                            <dl>
                                <dt>合约名称：</dt>
                                <dd><Text strong>{contract.name}</Text></dd>
                            </dl>
                        )}
                        <dl>
                            <dt>所有者：</dt>
                            <dd>
                                <Space>
                                    <Text code>{currentNFT.owner_address}</Text>
                                    <Button 
                                        size="small" 
                                        icon={<CopyOutlined />} 
                                        onClick={() => {
                                            copyToClip(currentNFT.owner_address);
                                            message.success('已复制');
                                        }}
                                    />
                                </Space>
                            </dd>
                        </dl>
                        <dl>
                            <dt>铸造者：</dt>
                            <dd>
                                <Space>
                                    <Text code>{currentNFT.minter_address}</Text>
                                    <Button 
                                        size="small" 
                                        icon={<CopyOutlined />} 
                                        onClick={() => {
                                            copyToClip(currentNFT.minter_address);
                                            message.success('已复制');
                                        }}
                                    />
                                </Space>
                            </dd>
                        </dl>
                        <dl>
                            <dt>网络：</dt>
                            <dd>{renderNetwork(currentNFT.network || '', currentNFT)}</dd>
                        </dl>
                        <dl>
                            <dt>状态：</dt>
                            <dd>{renderStatus(currentNFT.status)}</dd>
                        </dl>
                        {currentNFT.transaction_hash && (
                            <dl>
                                <dt>交易哈希：</dt>
                                <dd>
                                    <Space>
                                        <Text code>{currentNFT.transaction_hash.substring(0, 20)}...</Text>
                                        <Button 
                                            size="small" 
                                            icon={<CopyOutlined />} 
                                            onClick={() => {
                                                copyToClip(currentNFT.transaction_hash!);
                                                message.success('已复制');
                                            }}
                                        />
                                    </Space>
                                </dd>
                            </dl>
                        )}
                        {currentNFT.metadata_uri && (
                            <dl>
                                <dt>元数据URI：</dt>
                                <dd>
                                    <Space>
                                        <Text code>{currentNFT.metadata_uri}</Text>
                                        <Button 
                                            size="small" 
                                            icon={<CopyOutlined />} 
                                            onClick={() => {
                                                copyToClip(currentNFT.metadata_uri!);
                                                message.success('已复制');
                                            }}
                                        />
                                    </Space>
                                </dd>
                            </dl>
                        )}
                        <dl>
                            <dt>铸造时间：</dt>
                            <dd>{dayjs(currentNFT.create_time).format('YYYY-MM-DD HH:mm:ss')}</dd>
                        </dl>

                        {attributes && attributes.length > 0 && (
                            <>
                                <Divider />
                                <Title level={5}>属性</Title>
                                <Row gutter={[8, 8]}>
                                    {attributes.map((attr: any, index: number) => (
                                        <Col span={12} key={index}>
                                            <Card size="small" className={styles.attributeCard}>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {attr.trait_type || attr.name}
                                                </Text>
                                                <div>
                                                    <Text strong>{attr.value}</Text>
                                                </div>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            </>
                        )}

                        {currentNFT.remark && (
                            <>
                                <Divider />
                                <dl>
                                    <dt>备注：</dt>
                                    <dd><Text>{currentNFT.remark}</Text></dd>
                                </dl>
                            </>
                        )}
                    </Col>
                </Row>
            </div>
        );
    };

    return (
        <div className={`f-fit-height f-flex-col ${styles.nftManage}`}>
            {/* 统计卡片 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <Card className={styles.statsCard}>
                        <Statistic
                            title="NFT总数"
                            value={totalNFTs}
                            prefix={<GiftOutlined />}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className={styles.statsCard}>
                        <Statistic
                            title="已铸造"
                            value={mintedNFTs}
                            prefix={<CheckCircleOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className={styles.statsCard}>
                        <Statistic
                            title="合约数"
                            value={uniqueContracts}
                            prefix={<AppstoreOutlined />}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className={styles.statsCard}>
                        <Statistic
                            title="持有者"
                            value={uniqueOwners}
                            prefix={<WalletOutlined />}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
            </Row>
            <div className="f-flex-two-side">
                <QueryBar onChange={onQuery} spinning={spinning} className={styles.queryBar}>
                    <QueryBar.QueryItem name="name" label="NFT名称">
                        <Input allowClear placeholder="请输入NFT名称"/>
                    </QueryBar.QueryItem>

                    <QueryBar.QueryItem name="token_id" label="Token ID">
                        <Input allowClear placeholder="请输入Token ID"/>
                    </QueryBar.QueryItem>

                    <QueryBar.QueryItem name="contract_address" label="合约地址">
                        <Input allowClear placeholder="请输入合约地址"/>
                    </QueryBar.QueryItem>

                    <QueryBar.QueryItem name="owner_address" label="持有者地址">
                        <Input allowClear placeholder="请输入持有者地址"/>
                    </QueryBar.QueryItem>

                    <QueryBar.QueryItem name="status" label="状态">
                        <Select allowClear placeholder="请选择状态">
                            <Option value="pending">铸造中</Option>
                            <Option value="minted">已铸造</Option>
                            <Option value="failed">失败</Option>
                        </Select>
                    </QueryBar.QueryItem>
                </QueryBar>

                <Space>
                    <Button 
                        type="primary" 
                        icon={<GiftOutlined />} 
                        onClick={onMintNFT}
                        size="large"
                    >
                        铸造NFT
                    </Button>
                    <Button
                        icon={<CloudUploadOutlined />}
                        onClick={() => {
                            importForm.resetFields();
                            setImportContract(null);
                            setUseExistingOwnerAccount(false);
                            setIsImportModalVisible(true);
                        }}
                        size="large"
                    >
                        导入NFT
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
                    <Column 
                        title="图片" 
                        dataIndex="image_url" 
                        key="image_url" 
                        width={80}
                        render={renderNFTImage}
                    />
                    <Column 
                        title="NFT名称" 
                        dataIndex="name" 
                        key="name" 
                        width={150}
                        render={(name, row: INFT) => name || `Token #${row.token_id}`}
                    />
                    <Column 
                        title="Token ID" 
                        dataIndex="token_id" 
                        key="token_id" 
                        width={120}
                        render={(tokenId) => <Text code>{tokenId}</Text>}
                    />
                    <Column 
                        title="合约地址" 
                        dataIndex="contract_address" 
                        key="contract_address" 
                        render={renderCopyableCell}
                        width={180}
                    />
                    <Column 
                        title="所有者" 
                        dataIndex="owner_address" 
                        key="owner_address" 
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
                        render={renderStatus}
                        width={100}
                    />
                    <Column 
                        title="铸造时间" 
                        dataIndex="create_time" 
                        key="create_time"
                        render={(time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'}
                        width={180}
                    />
                    <Column 
                        title="操作" 
                        dataIndex="action" 
                        key="action" 
                        fixed="right" 
                        width={200} 
                        render={renderAction}
                    />
                </Table>
            </div>
            {/* 铸造NFT Modal */}
            <Modal
                title={<Space><GiftOutlined />铸造NFT</Space>}
                open={isMintModalVisible}
                onCancel={onCancelMintModal}
                width={900}
                className={styles.mintModal}
                footer={[
                    <Button key="cancel" onClick={onCancelMintModal}>
                        取消
                    </Button>,
                    <Button 
                        key="mint" 
                        type="primary" 
                        icon={<GiftOutlined />}
                        onClick={mintNFT}
                        loading={minting}
                        disabled={!selectedContract || !selectedAccount}
                    >
                        铸造NFT
                    </Button>
                ]}
            >
                <Form form={form} layout="vertical">
                    <Tabs defaultActiveKey="basic">
                        <TabPane 
                            tab={<span><FileTextOutlined />基本信息</span>} 
                            key="basic"
                        >
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                <Alert
                                    message="提示"
                                    description="请先选择已部署的NFT合约，然后输入NFT的元数据信息。确保合约支持标准的mint方法。"
                                    type="info"
                                    showIcon
                                />

                                <Form.Item
                                    name="contractId"
                                    label="NFT合约"
                                    rules={[{ required: true, message: '请选择NFT合约' }]}
                                >
                                    <Select 
                                        placeholder="请选择已部署的NFT合约"
                                        onChange={(value) => {
                                            const contract = contractList.find(c => c.id === value);
                                            setSelectedContract(contract || null);
                                        }}
                                        showSearch
                                        optionFilterProp="children"
                                    >
                                        {contractList.map(contract => (
                                            <Option key={contract.id} value={contract.id}>
                                                <Space>
                                                    <AppstoreOutlined />
                                                    {contract.name}
                                                    <Text type="secondary">
                                                        ({contract.address?.substring(0, 8)}...)
                                                    </Text>
                                                </Space>
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>

                                <Form.Item
                                    name="accountId"
                                    label="铸造账户"
                                    rules={[{ required: true, message: '请选择铸造账户' }]}
                                >
                                    <Select 
                                        placeholder="请选择用于铸造的账户（需要有私钥）"
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
                                                    </Space>
                                                </Option>
                                            ))}
                                    </Select>
                                </Form.Item>

                                <Form.Item
                                    label={
                                        <Space>
                                            <span>接收地址</span>
                                            <Checkbox 
                                                checked={useExistingAccount}
                                                onChange={(e) => {
                                                    setUseExistingAccount(e.target.checked);
                                                    form.setFieldValue('recipientAddress', undefined);
                                                }}
                                            >
                                                使用已有账户
                                            </Checkbox>
                                        </Space>
                                    }
                                    tooltip="NFT将被铸造到此地址"
                                >
                                    <Form.Item
                                        name="recipientAddress"
                                        noStyle
                                        rules={[
                                            { required: true, message: useExistingAccount ? '请选择接收地址' : '请输入接收地址' },
                                            ...(!useExistingAccount ? [{ pattern: /^0x[a-fA-F0-9]{40}$/, message: '请输入有效的以太坊地址' }] : [])
                                        ]}
                                    >
                                        {useExistingAccount ? (
                                            <Select 
                                                placeholder="请选择已有账户地址"
                                                showSearch
                                                optionFilterProp="children"
                                            >
                                                {accountList.map(account => (
                                                    <Option key={account.id} value={account.address}>
                                                        <Space>
                                                            <WalletOutlined />
                                                            {account.name}
                                                            <Text type="secondary">
                                                                ({account.address.substring(0, 8)}...{account.address.substring(account.address.length - 6)})
                                                            </Text>
                                                        </Space>
                                                    </Option>
                                                ))}
                                            </Select>
                                        ) : (
                                            <Input 
                                                placeholder="0x..."
                                                prefix={<WalletOutlined />}
                                                addonAfter={
                                                    selectedAccount && (
                                                        <Button 
                                                            type="link" 
                                                            size="small"
                                                            onClick={() => {
                                                                form.setFieldValue('recipientAddress', selectedAccount.address);
                                                            }}
                                                        >
                                                            使用当前账户
                                                        </Button>
                                                    )
                                                }
                                            />
                                        )}
                                    </Form.Item>
                                </Form.Item>

                                <Form.Item
                                    name="mintPrice"
                                    label="铸造价格（可选）"
                                    tooltip="如果合约需要支付以太币才能铸造，请在此输入金额。留空则不发送以太币。支持 ETH、Gwei、wei 三种单位。"
                                >
                                    <Input.Group compact style={{ display: 'flex' }}>
                                        <Input
                                            placeholder={priceUnit === 'wei' ? "0" : "0.0"}
                                            style={{ flex: 1 }}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                // 根据单位进行不同的验证
                                                if (value === '') {
                                                    form.setFieldValue('mintPrice', undefined);
                                                    return;
                                                }
                                                
                                                if (priceUnit === 'wei') {
                                                    // wei 只允许正整数
                                                    if (/^\d+$/.test(value)) {
                                                        form.setFieldValue('mintPrice', value);
                                                    }
                                                } else {
                                                    // ETH 和 Gwei 允许小数
                                                    if (/^\d*\.?\d*$/.test(value)) {
                                                        form.setFieldValue('mintPrice', value);
                                                    }
                                                }
                                            }}
                                        />
                                        <Select
                                            value={priceUnit}
                                            onChange={(value) => {
                                                setPriceUnit(value);
                                                // 清空当前价格值，避免单位转换问题
                                                form.setFieldValue('mintPrice', undefined);
                                            }}
                                            style={{ width: 80 }}
                                            getPopupContainer={(triggerNode) => {
                                                // 确保下拉框挂载在正确的容器中
                                                return triggerNode.parentElement || document.body;
                                            }}
                                            dropdownRender={(menu) => {
                                                // 确保下拉菜单正常渲染
                                                return menu;
                                            }}
                                        >
                                            <Option value="ETH">ETH</Option>
                                            <Option value="Gwei">Gwei</Option>
                                            <Option value="wei">wei</Option>
                                        </Select>
                                    </Input.Group>
                                </Form.Item>

                                <Row gutter={16}>
                                    <Col span={18}>
                                        <Form.Item
                                            name="tokenId"
                                            label="Token ID"
                                            rules={[{ required: !autoTokenId, message: '请输入Token ID' }]}
                                        >
                                            <Input 
                                                placeholder={autoTokenId ? "将自动生成" : "请输入Token ID"}
                                                disabled={autoTokenId}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={6}>
                                        <Form.Item label=" " colon={false}>
                                            <Button 
                                                block
                                                type={autoTokenId ? 'primary' : 'default'}
                                                onClick={() => setAutoTokenId(!autoTokenId)}
                                            >
                                                {autoTokenId ? '自动' : '手动'}
                                            </Button>
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Space>
                        </TabPane>

                        <TabPane 
                            tab={<span><PictureOutlined />元数据</span>} 
                            key="metadata"
                        >
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                <Alert
                                    message="元数据说明"
                                    description="您可以手动输入元数据信息，或者在下方使用JSON格式直接粘贴完整的元数据。"
                                    type="info"
                                    showIcon
                                />

                                <Form.Item
                                    name="nftName"
                                    label="NFT名称"
                                    rules={[{ required: !metadataJson, message: '请输入NFT名称' }]}
                                >
                                    <Input 
                                        placeholder="请输入NFT名称"
                                        disabled={!!metadataJson}
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="description"
                                    label="描述"
                                >
                                    <TextArea 
                                        placeholder="请输入NFT描述"
                                        rows={3}
                                        disabled={!!metadataJson}
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="imageUrl"
                                    label="图片URL"
                                    rules={[{ required: !metadataJson, message: '请输入图片URL' }]}
                                >
                                    <Input 
                                        placeholder="https://..."
                                        prefix={<PictureOutlined />}
                                        disabled={!!metadataJson}
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="metadataUri"
                                    label="元数据URI（可选）"
                                    tooltip="如果合约支持，可以指定元数据URI（IPFS或HTTP URL）"
                                >
                                    <Input 
                                        placeholder="ipfs://... 或 https://..."
                                        prefix={<LinkOutlined />}
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="attributes"
                                    label="属性（JSON格式）"
                                    tooltip='格式: [{"trait_type":"属性名","value":"属性值"}]'
                                >
                                    <TextArea 
                                        placeholder='[{"trait_type":"Background","value":"Blue"}]'
                                        rows={4}
                                        disabled={!!metadataJson}
                                        className={styles.codeEditor}
                                    />
                                </Form.Item>

                                <Divider>或使用完整元数据JSON</Divider>

                                <div>
                                    <Text strong>完整元数据JSON</Text>
                                    <TextArea 
                                        value={metadataJson}
                                        onChange={(e) => setMetadataJson(e.target.value)}
                                        placeholder='{"name":"NFT Name","description":"Description","image":"https://...","attributes":[...]}'
                                        rows={8}
                                        className={styles.codeEditor}
                                    />
                                    {metadataJson && (
                                        <Button 
                                            size="small" 
                                            onClick={() => setMetadataJson('')}
                                            style={{ marginTop: 8 }}
                                        >
                                            清除JSON（使用表单输入）
                                        </Button>
                                    )}
                                </div>

                                <Form.Item
                                    name="remark"
                                    label="备注"
                                >
                                    <Input placeholder="备注信息（可选）" />
                                </Form.Item>
                            </Space>
                        </TabPane>
                    </Tabs>
                </Form>
            </Modal>
            {/* 导入NFT Modal */}
            <Modal
                title={<Space><CloudUploadOutlined />导入NFT</Space>}
                open={isImportModalVisible}
                onCancel={() => setIsImportModalVisible(false)}
                width={700}
                className={styles.mintModal}
                footer={[
                    <Button key="cancel" onClick={() => setIsImportModalVisible(false)}>
                        取消
                    </Button>,
                    <Button
                        key="import"
                        type="primary"
                        icon={<CloudUploadOutlined />}
                        onClick={importNFT}
                        loading={importing}
                        disabled={!importContract}
                    >
                        导入NFT
                    </Button>
                ]}
            >
                <Form form={importForm} layout="vertical">
                    <Alert
                        message="导入说明"
                        description="从链上导入已有的NFT记录到本系统。请选择对应的合约、网络并输入Token ID，系统会尽量从链上读取持有者和元数据URI。"
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />

                    <Form.Item
                        name="contractId"
                        label="NFT合约"
                        rules={[{ required: true, message: '请选择NFT合约' }]}
                    >
                        <Select
                            placeholder="请选择已部署的NFT合约"
                            onChange={(value) => {
                                const contract = contractList.find(c => c.id === value);
                                setImportContract(contract || null);
                                if (contract && contract.network_id) {
                                    const targetNetwork = networkList.find(
                                        (n: any) => n.id === contract.network_id
                                    );
                                    if (targetNetwork) {
                                        importForm.setFieldsValue({ networkId: targetNetwork.id });
                                    }
                                }
                            }}
                            showSearch
                            optionFilterProp="children"
                        >
                            {contractList.map(contract => (
                                <Option key={contract.id} value={contract.id}>
                                    <Space>
                                        <AppstoreOutlined />
                                        {contract.name}
                                        <Text type="secondary">
                                            ({contract.address?.substring(0, 8)}...)
                                        </Text>
                                    </Space>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="networkId"
                        label="网络"
                        rules={[{ required: true, message: '请选择网络' }]}
                    >
                        <Select
                            placeholder="请选择网络"
                            showSearch
                            optionFilterProp="children"
                        >
                            {networkList.map(network => (
                                <Option key={network.id} value={network.id}>
                                    <Space>
                                        <Tag color={network.is_testnet ? 'orange' : 'green'}>
                                            {network.is_testnet ? 'Testnet' : 'Mainnet'}
                                        </Tag>
                                        {network.name}
                                        <Text type="secondary">
                                            (Chain: {network.chain_id})
                                        </Text>
                                    </Space>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    

                    <Form.Item
                        name="tokenId"
                        label="Token ID"
                        rules={[{ required: true, message: '请输入Token ID' }]}
                    >
                        <Input
                            placeholder="请输入要导入的Token ID"
                            addonAfter={
                                <Button
                                    type="link"
                                    onClick={fetchOnchainNFTInfo}
                                    loading={fetchingOnchainInfo}
                                    disabled={!importContract}
                                >
                                    拉取链上信息
                                </Button>
                            }
                        />
                    </Form.Item>

                    <Form.Item
                        label={
                            <Space>
                                <span>持有者地址（可选）</span>
                                <Checkbox
                                    checked={useExistingOwnerAccount}
                                    onChange={(e) => {
                                        setUseExistingOwnerAccount(e.target.checked);
                                        importForm.setFieldValue('ownerAddress', undefined);
                                    }}
                                >
                                    使用已有账户
                                </Checkbox>
                            </Space>
                        }
                        tooltip="如果链上无法读取 ownerOf，将使用此地址作为当前持有者"
                    >
                        <Form.Item
                            name="ownerAddress"
                            noStyle
                            rules={[
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value) return Promise.resolve();
                                        if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('请输入有效的以太坊地址'));
                                    }
                                })
                            ]}
                        >
                            {useExistingOwnerAccount ? (
                                <Select
                                    placeholder="请选择已有账户地址"
                                    showSearch
                                    optionFilterProp="children"
                                >
                                    {accountList.map(account => (
                                        <Option key={account.id} value={account.address}>
                                            <Space>
                                                <WalletOutlined />
                                                {account.name}
                                                <Text type="secondary">
                                                    ({account.address.substring(0, 8)}...{account.address.substring(account.address.length - 6)})
                                                </Text>
                                            </Space>
                                        </Option>
                                    ))}
                                </Select>
                            ) : (
                                <Input placeholder="0x..." prefix={<WalletOutlined />} />
                            )}
                        </Form.Item>
                    </Form.Item>

                    <Form.Item
                        name="metadataUri"
                        label="元数据URI（可选）"
                        tooltip="如留空，系统会尝试调用 tokenURI(tokenId) 获取"
                    >
                        <Input
                            placeholder="ipfs://... 或 https://..."
                            prefix={<LinkOutlined />}
                        />
                    </Form.Item>

                    <Form.Item
                        name="remark"
                        label="备注（可选）"
                    >
                        <Input placeholder="例如：从某地址导入的NFT" />
                    </Form.Item>
                </Form>
            </Modal>
            {/* NFT详情Modal */}
            <Modal
                title={
                    <Space>
                        <FileTextOutlined />
                        {isEditingNFT ? '编辑NFT信息' : 'NFT详情'}
                    </Space>
                }
                open={isDetailModalVisible}
                onCancel={() => {
                    setIsEditingNFT(false);
                    setIsDetailModalVisible(false);
                }}
                width={1000}
                footer={[
                    <Button 
                        key="cancel" 
                        onClick={() => {
                            setIsEditingNFT(false);
                            setIsDetailModalVisible(false);
                        }}
                    >
                        {isEditingNFT ? '取消' : '关闭'}
                    </Button>,
                    isEditingNFT ? (
                        <>
                            <Button
                                key="save"
                                type="primary"
                                icon={<CheckCircleOutlined />}
                                onClick={handleUpdateNFT}
                                loading={updatingNFT}
                            >
                                保存
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                key="fetch"
                                icon={<SyncOutlined />}
                                onClick={fetchOnchainNFTInfoForDetail}
                                loading={fetchingOnchainNFTInfo}
                            >
                                从链上获取
                            </Button>
                            <Button
                                key="edit"
                                icon={<EditOutlined />}
                                onClick={handleEditNFT}
                            >
                                编辑
                            </Button>
                        </>
                    )
                ]}
                className={styles.detailModal}
            >
                {renderNFTDetail()}
            </Modal>
            {/* NFT转让Modal */}
            <NFTTxModal
                visible={isTransferModalVisible}
                nft={transferNFT}
                accountList={accountList}
                contractList={contractList}
                networkList={networkList}
                onCancel={() => {
                    setIsTransferModalVisible(false);
                    setTransferNFT(null);
                }}
                onSuccess={() => {
                    onQuery();
                }}
            />
        </div>
    );
}

