import { useState, useEffect, useCallback } from 'react';
import { Select, Typography, Space, Empty, Spin, Button, message } from 'antd';
import { BookOutlined, SaveOutlined } from '@ant-design/icons';
import { getWorldRuleSnapshotList } from '@/src/api/aiNovel';
import { IWorldRuleSnapshot } from '@/src/types/IAiNoval';
import { useWorldViewData, useLoadWorldviewList } from '../../worldviewManageContext';
import * as apiCalls from '../../apiCalls';

const { Option } = Select;
const { Title, Text } = Typography;

interface WorldBookSnapshotDisplayProps {
    defaultSnapshotId?: number | null; // 世界观基础信息中指定的默认快照ID
}

export default function WorldBookSnapshotDisplay({ defaultSnapshotId }: WorldBookSnapshotDisplayProps) {
    const [worldViewData] = useWorldViewData();
    const loadWorldviewList = useLoadWorldviewList();
    const [snapshots, setSnapshots] = useState<IWorldRuleSnapshot[]>([]);
    const [selectedSnapshotId, setSelectedSnapshotId] = useState<number | null | undefined>(defaultSnapshotId);
    const [loading, setLoading] = useState(false);
    const [defaultSnapshot, setDefaultSnapshot] = useState<IWorldRuleSnapshot | null>(null);
    const [selectedSnapshot, setSelectedSnapshot] = useState<IWorldRuleSnapshot | null>(null);

    // 加载快照列表
    const loadSnapshots = useCallback(async () => {
        if (!worldViewData?.id) return;

        setLoading(true);
        try {
            const result = await getWorldRuleSnapshotList(worldViewData.id, 1, 100);
            setSnapshots(result.data || []);
        } catch (error: any) {
            console.error('加载快照列表失败:', error);
        } finally {
            setLoading(false);
        }
    }, [worldViewData?.id]);

    // 初始化时加载快照列表
    useEffect(() => {
        loadSnapshots();
    }, [loadSnapshots]);

    // 当快照列表或默认快照ID变化时，更新默认快照和选中快照
    useEffect(() => {
        if (snapshots.length > 0) {
            // 查找默认快照
            const defaultSnap = defaultSnapshotId 
                ? snapshots.find(s => s.id === defaultSnapshotId) || null
                : null;
            setDefaultSnapshot(defaultSnap);

            // 如果选中了快照，查找选中的快照
            if (selectedSnapshotId) {
                const selectedSnap = snapshots.find(s => s.id === selectedSnapshotId) || null;
                setSelectedSnapshot(selectedSnap);
            } else {
                setSelectedSnapshot(defaultSnap);
            }
        }
    }, [snapshots, defaultSnapshotId, selectedSnapshotId]);

    // 当 defaultSnapshotId 变化时，同步更新 selectedSnapshotId
    useEffect(() => {
        setSelectedSnapshotId(defaultSnapshotId);
    }, [defaultSnapshotId]);

    // 处理快照选择变化
    const handleSnapshotChange = (value: number | undefined) => {
        setSelectedSnapshotId(value ?? null);
        if (value) {
            const selectedSnap = snapshots.find(s => s.id === value) || null;
            setSelectedSnapshot(selectedSnap);
        } else {
            setSelectedSnapshot(defaultSnapshot);
        }
    };

    // 保存为默认快照
    const handleSaveDefault = async () => {
        if (!worldViewData?.id) return;
        try {
            await apiCalls.updateWorldView({
                id: worldViewData.id,
                title: worldViewData.title ?? undefined,
                content: worldViewData.content ?? undefined,
                is_dify_knowledge_base: worldViewData.is_dify_knowledge_base ?? undefined,
                base_timeline_id: worldViewData.base_timeline_id ?? undefined,
                default_snapshot_id: selectedSnapshotId ?? undefined,
            } as any);
            message.success('默认快照已更新');
            loadWorldviewList();
        } catch (e: any) {
            message.error(e?.message || '保存失败');
        }
    };

    // 判断是否需要显示 A|B 结构
    // 只要选择了快照，且与默认快照不同（包括默认快照未设置的情况），就显示对比
    const shouldShowComparison = selectedSnapshotId != null && selectedSnapshotId !== defaultSnapshotId;

    // 渲染快照内容
    const renderSnapshotContent = (snapshot: IWorldRuleSnapshot | null, label?: string) => {
        if (!snapshot) {
            return (
                <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '4px', minHeight: '10em' }}>
                    <Empty description={label ? `${label}：无快照内容` : '无快照内容'} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
            );
        }

        return (
            <div>
                {label && (
                    <div style={{ marginBottom: '8px' }}>
                        <Text strong>{label}：</Text>
                        <Text>{snapshot.title || `快照 #${snapshot.id}`}</Text>
                    </div>
                )}
                <div
                    style={{
                        padding: '16px',
                        background: '#f5f5f5',
                        borderRadius: '4px',
                        minHeight: '10em',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        lineHeight: '1.6'
                    }}
                >
                    {snapshot.content || '（无内容）'}
                </div>
            </div>
        );
    };

    return (
        <Spin spinning={loading}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Title level={4} style={{ margin: 0 }}>
                    <Space>
                        <BookOutlined />
                        <span>世界书快照</span>
                    </Space>
                </Title>

                {/* 选择快照操作栏：左侧当前默认快照，右侧选择+保存 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <Text strong style={{ marginRight: '6px' }}>默认快照：</Text>
                        <Text type={defaultSnapshot ? undefined : 'secondary'}>
                            {defaultSnapshot ? (defaultSnapshot.title || `快照 #${defaultSnapshot.id}`) : '<未设置默认快照>'}
                        </Text>
                    </div>
                    <Space style={{ marginLeft: 'auto' }}>
                        <Select
                            style={{ width: '320px' }}
                            placeholder="选择快照"
                            value={selectedSnapshotId ?? undefined}
                            onChange={handleSnapshotChange}
                            allowClear
                        >
                            {snapshots.map(snapshot => (
                                <Option key={snapshot.id} value={snapshot.id!}>
                                    {snapshot.title || `快照 #${snapshot.id}`}
                                </Option>
                            ))}
                        </Select>
                        <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveDefault}>
                            保存
                        </Button>
                    </Space>
                </div>

                {/* 快照内容展示 */}
                {shouldShowComparison ? (
                    // A|B 结构：显示默认快照和选中快照的对比
                    <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
                        <div style={{ flex: 1 }}>
                            {renderSnapshotContent(defaultSnapshot, '默认快照')}
                        </div>
                        <div style={{ 
                            width: '1px', 
                            background: '#d9d9d9',
                            alignSelf: 'stretch'
                        }} />
                        <div style={{ flex: 1 }}>
                            {renderSnapshotContent(selectedSnapshot)}
                        </div>
                    </div>
                ) : (
                    // 单个快照展示
                    <div>
                        {renderSnapshotContent(selectedSnapshot || defaultSnapshot)}
                    </div>
                )}
            </Space>
        </Spin>
    );
}
