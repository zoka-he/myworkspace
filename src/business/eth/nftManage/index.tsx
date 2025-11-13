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
    LinkOutlined, GiftOutlined, AppstoreOutlined
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
    const [currentNFT, setCurrentNFT] = useState<INFT | null>(null);
    const [minting, setMinting] = useState(false);
    const [form] = Form.useForm();
    const pagination = usePagination();

    // 铸造相关状态
    const [selectedContract, setSelectedContract] = useState<IContract | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<IEthAccount | null>(null);
    const [metadataJson, setMetadataJson] = useState('');
    const [autoTokenId, setAutoTokenId] = useState(true);
    const [useExistingAccount, setUseExistingAccount] = useState(false);

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

            // 尝试不同的mint方法
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
                if (metadataUri && hasMintWithURI) {
                    tx = await contract.mintWithURI(values.recipientAddress, tokenId, metadataUri);
                } else if (hasSafeMint) {
                    tx = await contract.safeMint(values.recipientAddress, tokenId);
                } else if (hasMint) {
                    tx = await contract.mint(values.recipientAddress, tokenId);
                } else {
                    throw new Error('合约没有可用的mint方法');
                }

                await tx.wait();

                // 保存NFT信息到数据库
                const nftData: any = {
                    contract_id: selectedContract.id,
                    contract_address: selectedContract.address,
                    token_id: tokenId,
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
    }, [selectedContract, selectedAccount, form, metadataJson, autoTokenId, networkList, onQuery]);

    function onMintNFT() {
        form.resetFields();
        setMetadataJson('');
        setSelectedContract(null);
        setSelectedAccount(null);
        setAutoTokenId(true);
        setUseExistingAccount(false);
        setIsMintModalVisible(true);
    }

    function onCancelMintModal() {
        setIsMintModalVisible(false);
    }

    function onViewNFT(nft: INFT) {
        setCurrentNFT(nft);
        setIsDetailModalVisible(true);
    }

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

            {/* NFT详情Modal */}
            <Modal
                title={<Space><FileTextOutlined />NFT详情</Space>}
                open={isDetailModalVisible}
                onCancel={() => setIsDetailModalVisible(false)}
                width={1000}
                footer={[
                    <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
                        关闭
                    </Button>
                ]}
                className={styles.detailModal}
            >
                {renderNFTDetail()}
            </Modal>
        </div>
    )
}

