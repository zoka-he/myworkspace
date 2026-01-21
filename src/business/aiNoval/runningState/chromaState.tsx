import { Button, Descriptions, Drawer, Empty, message, Modal, Popconfirm, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { useState, useEffect } from 'react';
import { 
    fetchChromaHealth, 
    fetchChromaCollections, 
    fetchChromaCollectionDetail,
    deleteChromaCollection,
    deleteChromaDocument
} from '@/src/api/chroma';
import { ReloadOutlined, DeleteOutlined, EyeOutlined, DatabaseOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface CollectionInfo {
    name: string;
    count: number;
}

interface DocumentInfo {
    id: string;
    content: string;
    metadata: Record<string, any>;
}

interface HealthInfo {
    status: 'connected' | 'disconnected';
    url: string;
    timestamp: string;
}

export default function ChromaState() {
    const [health, setHealth] = useState<HealthInfo | null>(null);
    const [collections, setCollections] = useState<CollectionInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    
    // 文档详情抽屉
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    const [documents, setDocuments] = useState<DocumentInfo[]>([]);
    const [documentTotal, setDocumentTotal] = useState(0);
    const [documentPage, setDocumentPage] = useState(1);
    const [documentPageSize, setDocumentPageSize] = useState(10);

    useEffect(() => {
        handleRefresh();
    }, []);

    async function handleRefresh() {
        setLoading(true);
        try {
            await Promise.all([
                handleFetchHealth(),
                handleFetchCollections()
            ]);
        } finally {
            setLoading(false);
        }
    }

    async function handleFetchHealth() {
        try {
            const res: any = await fetchChromaHealth();
            if (res?.success) {
                setHealth(res.data);
            } else {
                // API 返回了但 success 为 false
                console.error('健康检查返回失败:', res);
                setHealth({
                    status: 'disconnected',
                    url: res?.data?.url || '-',
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error: any) {
            console.error('获取健康状态失败:', error);
            setHealth({
                status: 'disconnected',
                url: '-',
                timestamp: new Date().toISOString()
            });
        }
    }

    async function handleFetchCollections() {
        try {
            const res: any = await fetchChromaCollections();
            if (res?.success) {
                setCollections(res.data || []);
            }
        } catch (error: any) {
            // 连接失败时不显示错误，因为健康检查已经显示了状态
            console.error('获取集合列表失败:', error);
        }
    }

    async function handleViewDocuments(collectionName: string) {
        setSelectedCollection(collectionName);
        setDrawerVisible(true);
        setDocumentPage(1);
        await fetchDocuments(collectionName, 1, documentPageSize);
    }

    async function fetchDocuments(collectionName: string, page: number, pageSize: number) {
        setDetailLoading(true);
        try {
            const res: any = await fetchChromaCollectionDetail(collectionName, {
                offset: (page - 1) * pageSize,
                limit: pageSize
            });
            if (res?.success) {
                setDocuments(res.data.documents || []);
                setDocumentTotal(res.data.total || 0);
            }
        } catch (error: any) {
            message.error(error.response?.data?.error || '获取文档列表失败');
        } finally {
            setDetailLoading(false);
        }
    }

    async function handleDeleteCollection(collectionName: string) {
        try {
            const res: any = await deleteChromaCollection(collectionName);
            if (res?.success) {
                message.success(`集合 "${collectionName}" 已删除`);
                handleFetchCollections();
            } else {
                message.error(res?.error || '删除失败');
            }
        } catch (error: any) {
            message.error(error.response?.data?.error || '删除集合失败');
        }
    }

    async function handleDeleteDocument(docId: string) {
        if (!selectedCollection) return;
        
        try {
            const res: any = await deleteChromaDocument(selectedCollection, docId);
            if (res?.success) {
                message.success('文档已删除');
                // 刷新文档列表
                await fetchDocuments(selectedCollection, documentPage, documentPageSize);
                // 刷新集合列表更新计数
                handleFetchCollections();
            } else {
                message.error(res?.error || '删除失败');
            }
        } catch (error: any) {
            message.error(error.response?.data?.error || '删除文档失败');
        }
    }

    function handleDocumentPageChange(page: number, pageSize: number) {
        setDocumentPage(page);
        setDocumentPageSize(pageSize);
        if (selectedCollection) {
            fetchDocuments(selectedCollection, page, pageSize);
        }
    }

    const connectState = health?.status === 'connected' 
        ? <Tag color="green">已连接</Tag> 
        : <Tag color="red">未连接</Tag>;

    const collectionColumns = [
        {
            title: '集合名称',
            dataIndex: 'name',
            key: 'name',
            render: (name: string) => (
                <Space>
                    <DatabaseOutlined />
                    <Text strong>{name}</Text>
                </Space>
            )
        },
        {
            title: '文档数量',
            dataIndex: 'count',
            key: 'count',
            width: 120,
            render: (count: number) => (
                <Tag color="blue">{count} 条</Tag>
            )
        },
        {
            title: '操作',
            key: 'actions',
            width: 160,
            render: (_: any, record: CollectionInfo) => (
                <Space>
                    <Tooltip title="查看文档">
                        <Button 
                            type="link" 
                            icon={<EyeOutlined />} 
                            onClick={() => handleViewDocuments(record.name)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="确定要删除这个集合吗？"
                        description="此操作不可恢复，集合内的所有文档都将被删除。"
                        onConfirm={() => handleDeleteCollection(record.name)}
                        okText="确定"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="删除集合">
                            <Button 
                                type="link" 
                                danger 
                                icon={<DeleteOutlined />}
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const documentColumns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 200,
            ellipsis: true,
            render: (id: string) => (
                <Tooltip title={id}>
                    <Text copyable={{ text: id }} style={{ fontSize: 12 }}>
                        {id.length > 24 ? `${id.slice(0, 24)}...` : id}
                    </Text>
                </Tooltip>
            )
        },
        {
            title: '内容',
            dataIndex: 'content',
            key: 'content',
            ellipsis: true,
            render: (content: string) => (
                <Tooltip title={content} overlayStyle={{ maxWidth: 500 }}>
                    <Paragraph 
                        ellipsis={{ rows: 2 }} 
                        style={{ marginBottom: 0, fontSize: 13 }}
                    >
                        {content || <Text type="secondary">(空内容)</Text>}
                    </Paragraph>
                </Tooltip>
            )
        },
        {
            title: '元数据',
            dataIndex: 'metadata',
            key: 'metadata',
            width: 200,
            render: (metadata: Record<string, any>) => {
                if (!metadata || Object.keys(metadata).length === 0) {
                    return <Text type="secondary">-</Text>;
                }
                const metaStr = JSON.stringify(metadata);
                return (
                    <Tooltip 
                        title={<pre style={{ margin: 0, fontSize: 12 }}>{JSON.stringify(metadata, null, 2)}</pre>}
                        overlayStyle={{ maxWidth: 400 }}
                    >
                        <Text 
                            copyable={{ text: metaStr }} 
                            style={{ fontSize: 12 }}
                            ellipsis
                        >
                            {metaStr.length > 30 ? `${metaStr.slice(0, 30)}...` : metaStr}
                        </Text>
                    </Tooltip>
                );
            }
        },
        {
            title: '操作',
            key: 'actions',
            width: 80,
            render: (_: any, record: DocumentInfo) => (
                <Popconfirm
                    title="确定要删除这个文档吗？"
                    onConfirm={() => handleDeleteDocument(record.id)}
                    okText="确定"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                >
                    <Tooltip title="删除文档">
                        <Button 
                            type="link" 
                            danger 
                            size="small"
                            icon={<DeleteOutlined />}
                        />
                    </Tooltip>
                </Popconfirm>
            )
        }
    ];

    return (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions title="ChromaDB 状态" bordered size="small" column={2}>
                <Descriptions.Item label="连接状态">
                    {connectState}
                </Descriptions.Item>
                <Descriptions.Item label="服务地址">
                    <Text code>{health?.url || '-'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="集合数量">
                    <Tag color="purple">{collections.length} 个</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="最后检查">
                    <Text type="secondary">
                        {health?.timestamp ? new Date(health.timestamp).toLocaleString() : '-'}
                    </Text>
                </Descriptions.Item>
            </Descriptions>

            <div className="f-flex-two-side">
                <Space>
                    <Typography.Title level={5} style={{ margin: 0 }}>
                        集合列表
                    </Typography.Title>
                </Space>
                <Space>
                    <Button 
                        type="primary" 
                        size="small" 
                        icon={<ReloadOutlined />}
                        loading={loading}
                        onClick={handleRefresh}
                    >
                        刷新
                    </Button>
                </Space>
            </div>

            {collections.length === 0 && !loading ? (
                <Empty 
                    description="暂无集合" 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            ) : (
                <Table 
                    dataSource={collections} 
                    columns={collectionColumns}
                    rowKey="name"
                    bordered 
                    size="small"
                    loading={loading}
                    pagination={false}
                />
            )}

            <Drawer
                title={
                    <Space>
                        <DatabaseOutlined />
                        <span>集合详情: {selectedCollection}</span>
                    </Space>
                }
                placement="right"
                width={800}
                onClose={() => {
                    setDrawerVisible(false);
                    setSelectedCollection(null);
                    setDocuments([]);
                }}
                open={drawerVisible}
                extra={
                    <Button 
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={() => selectedCollection && fetchDocuments(selectedCollection, documentPage, documentPageSize)}
                    >
                        刷新
                    </Button>
                }
            >
                <Table
                    dataSource={documents}
                    columns={documentColumns}
                    rowKey="id"
                    bordered
                    size="small"
                    loading={detailLoading}
                    pagination={{
                        current: documentPage,
                        pageSize: documentPageSize,
                        total: documentTotal,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `共 ${total} 条`,
                        onChange: handleDocumentPageChange,
                    }}
                />
            </Drawer>
        </Space>
    );
}
