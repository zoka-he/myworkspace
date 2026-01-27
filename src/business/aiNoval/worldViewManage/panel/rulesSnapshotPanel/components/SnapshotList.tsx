import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Popconfirm, Space, Empty, message } from 'antd';
import { HistoryOutlined, EditOutlined, DeleteOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getWorldRuleSnapshotList, deleteWorldRuleSnapshot } from '@/src/api/aiNovel';
import { ISnapshotData } from '../types';
import SnapshotViewModal from './SnapshotViewModal';
import styles from '../index.module.scss';

interface SnapshotListProps {
    worldviewId?: number;
    onSelectSnapshot: (snapshot: ISnapshotData) => void;
    onNewSnapshot: () => void;
    refreshTrigger?: number; // 触发刷新的标志
}

export default function SnapshotList({
    worldviewId,
    onSelectSnapshot,
    onNewSnapshot,
    refreshTrigger
}: SnapshotListProps) {
    const [snapshots, setSnapshots] = useState<ISnapshotData[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewingSnapshot, setViewingSnapshot] = useState<ISnapshotData | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    const loadSnapshots = useCallback(async () => {
        if (!worldviewId) return;
        
        setLoading(true);
        try {
            const result = await getWorldRuleSnapshotList(worldviewId, 1, 100);
            setSnapshots(result.data || []);
        } catch (error: any) {
            console.error('加载快照列表失败:', error);
            message.error('加载快照列表失败: ' + (error.message || '未知错误'));
        } finally {
            setLoading(false);
        }
    }, [worldviewId]);

    useEffect(() => {
        loadSnapshots();
    }, [loadSnapshots, refreshTrigger]);

    const handleDelete = async (id: number) => {
        try {
            await deleteWorldRuleSnapshot(id);
            message.success('删除成功');
            loadSnapshots();
        } catch (error: any) {
            message.error('删除失败: ' + (error.message || '未知错误'));
        }
    };

    const columns: ColumnsType<ISnapshotData> = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            render: (id) => id ? `#${id}` : '-'
        },
        {
            title: '标题',
            dataIndex: 'title',
            key: 'title',
            width: 200,
            ellipsis: true,
            render: (title: string) => title || '-'
        },
        {
            title: '内容预览',
            dataIndex: 'content',
            key: 'content',
            width: 200,
            ellipsis: true,
            render: (content: string) => {
                if (!content) return '-';
                return content.length > 20 
                    ? content.substring(0, 20) + '...'
                    : content;
            }
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 180,
            render: (date: string | Date) => {
                if (!date) return '-';
                return new Date(date).toLocaleString('zh-CN');
            }
        },
        {
            title: '更新时间',
            dataIndex: 'updated_at',
            key: 'updated_at',
            width: 180,
            render: (date: string | Date) => {
                if (!date) return '-';
                return new Date(date).toLocaleString('zh-CN');
            }
        },
        {
            title: '操作',
            key: 'action',
            width: 180,
            fixed: 'right',
            render: (_, record) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => {
                            setViewingSnapshot(record);
                            setIsViewModalOpen(true);
                        }}
                    >
                        查看
                    </Button>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => onSelectSnapshot(record)}
                    ></Button>
                    <Popconfirm
                        title="确定要删除这个快照吗？"
                        description="删除后无法恢复"
                        onConfirm={() => record.id && handleDelete(record.id)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                        ></Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <Card 
            title={
                <div className={styles.cardTitle}>
                    <HistoryOutlined /> 快照管理
                </div>
            }
            extra={
                <Button 
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={onNewSnapshot}
                >
                    新建快照
                </Button>
            }
            className={styles.listCard}
        >
            <Table
                columns={columns}
                dataSource={snapshots}
                loading={loading}
                rowKey="id"
                size="small"
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 条`
                }}
                scroll={{ x: 'max-content' }}
                locale={{
                    emptyText: <Empty description="暂无快照" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                }}
            />
            
            <SnapshotViewModal
                open={isViewModalOpen}
                snapshot={viewingSnapshot}
                onCancel={() => {
                    setIsViewModalOpen(false);
                    setViewingSnapshot(null);
                }}
            />
        </Card>
    );
}
