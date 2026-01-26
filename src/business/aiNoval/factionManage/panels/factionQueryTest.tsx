import { Button, Input, InputNumber, Tag, Alert, Card, Space, Typography, Descriptions, message } from "antd";
import { SearchOutlined, ClearOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useCurrentFaction, useWorldViewId } from "../FactionManageContext";
import apiCalls from "../apiCalls";
import { ApiResponse } from "@/src/types/ApiResponse";
import { IFactionDefData } from "@/src/types/IAiNoval";

const { Text } = Typography;

export interface IFactionQueryTestProps {
    worldViewId?: number | null;
}

interface QueryResult extends IFactionDefData {
    score: number;
    db_score?: number;
    chroma_score?: number;
    combined_score?: number;
    factionName?: string;
    content?: string;
    metadata?: {
        source?: string;
        timestamp?: string;
    };
}

export default function FactionQueryTest(props: IFactionQueryTestProps) {
    const currentFaction = useCurrentFaction();
    const [worldViewId] = useWorldViewId();
    
    const [queryText, setQueryText] = useState('');
    const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [threshold, setThreshold] = useState<number>(0.5);

    // 默认查询文本
    const defaultQuery = '';

    useEffect(() => {
        // 当切换阵营时，重置查询结果和查询文本
        let factionName = currentFaction?.name || '';
        setQueryText(factionName);
    }, [currentFaction?.id, defaultQuery]);

    // 处理查询
    async function handleQuery() {
        const query = queryText.trim() || defaultQuery;
        
        if (!query.trim()) {
            return;
        }

        if (!worldViewId) {
            message.warning('请先选择世界观');
            return;
        }

        // 将查询文本分割为关键词数组
        const keywordList = query
            .split(/[,\n，]/)
            .map(k => k.trim())
            .filter(k => k.length > 0);
        
        if (keywordList.length === 0) {
            message.warning('请输入至少一个关键词');
            return;
        }

        setIsLoading(true);
        setQueryResults([]); // 立即清空之前的结果
        
        try {
            const response = await apiCalls.findFaction(worldViewId, keywordList, threshold);
            const result = response as unknown as ApiResponse<QueryResult[]>;
            
            if (result?.success && result.data) {
                // 转换数据格式以匹配 UI 期望的格式
                const formattedResults: QueryResult[] = result.data.map((item: QueryResult) => ({
                    ...item,
                    factionName: item.name || '-',
                    content: item.description || '-',
                    // metadata: {
                    //     source: '阵营知识库',
                    //     timestamp: new Date().toLocaleString('zh-CN')
                    // }
                }));
                
                setQueryResults(formattedResults);
                if (formattedResults.length === 0) {
                    message.info('未找到匹配的阵营');
                }
            } else {
                message.error(result?.error || '查询失败');
                setQueryResults([]);
            }
        } catch (error: any) {
            console.error('查询阵营失败:', error);
            message.error(error?.message || '查询失败，请稍后重试');
            setQueryResults([]);
        } finally {
            setIsLoading(false);
        }
    }

    // 清空表单和结果
    const handleClear = () => {
        setQueryText(defaultQuery);
        setThreshold(0.7);
        setQueryResults([]);
    };

    // 获取分数颜色
    const getScoreColor = (score: number) => {
        if (score >= 0.8) return 'success';
        if (score >= 0.6) return 'processing';
        if (score >= 0.4) return 'warning';
        return 'error';
    };

    const lowQuality = queryResults.length > 0 && !queryResults.some(item => item.score > threshold);

    // 检查世界观
    if (!worldViewId) {
        return (
            <div className="f-fit-height" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Alert message="请先选择世界观" type="info" />
            </div>
        );
    }

    return (
        <div style={{ padding: '16px' }}>
            {/* Inline 查询表单 */}
            <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
                <Space wrap>
                    <Text strong>关键词：</Text>
                    <Input
                        style={{ width: 400 }}
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                        placeholder={defaultQuery}
                        onPressEnter={handleQuery}
                        allowClear
                    />
                    <Text strong>阈值：</Text>
                    <InputNumber
                        style={{ width: 100 }}
                        min={0}
                        max={1}
                        step={0.1}
                        precision={2}
                        value={threshold}
                        onChange={(value) => setThreshold(value || 0.7)}
                        placeholder="0.7"
                    />
                    <Button
                        type="primary"
                        icon={<SearchOutlined />}
                        onClick={handleQuery}
                        disabled={!queryText.trim()}
                        loading={isLoading}
                    >
                        查询
                    </Button>
                    <Button
                        icon={<ClearOutlined />}
                        onClick={handleClear}
                    >
                        清空
                    </Button>
                </Space>
            </Space>

            {/* 查询结果统计 */}
            {queryResults.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">
                        共找到 <Text strong>{queryResults.length}</Text> 条匹配记录
                    </Text>
                </div>
            )}

            {/* 质量警告 */}
            {lowQuality && queryResults.length > 0 && (
                <Alert 
                    message={`召回结果置信度全部小于${threshold}，请检查知识库质量或优化查询词。`} 
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

            {/* 结果卡片列表 */}
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Text type="secondary">查询中...</Text>
                    </div>
                ) : queryResults.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Text type="secondary">暂无数据，请先进行查询</Text>
                    </div>
                ) : (
                    queryResults.map((item) => {
                        return (
                            <Card
                                key={item.id}
                                size="small"
                                style={{ width: '100%' }}
                                title={
                                    <Text strong style={{ fontSize: '16px' }}>
                                        {item.factionName || '-'}
                                    </Text>
                                }
                                extra={
                                    <Space size="small" align="end">
                                        
                                        <Space size="small">
                                            {item.chroma_score !== undefined && (
                                                <Tag>向量: {item.chroma_score.toFixed(3)}</Tag>
                                            )}
                                            {item.db_score !== undefined && (
                                                <Tag>数据库: {item.db_score.toFixed(3)}</Tag>
                                            )}
                                        </Space>
                                        <Text type="secondary"> | </Text>
                                        {item.score !== undefined && (
                                            <Tag color={getScoreColor(item.score)}>
                                                置信度: {(item.score * 100).toFixed(2)}%
                                            </Tag>
                                        )}
                                    </Space>
                                }
                            >
                                <Descriptions size="small" column={2} bordered>
                                    {item.id && (
                                        <Descriptions.Item label="ID">{item.id}</Descriptions.Item>
                                    )}
                                    {item.factionName && (
                                        <Descriptions.Item label="阵营名称">{item.factionName}</Descriptions.Item>
                                    )}
                                    {/* {item.metadata?.source && (
                                        <Descriptions.Item label="来源">{item.metadata.source}</Descriptions.Item>
                                    )}
                                    {item.metadata?.timestamp && (
                                        <Descriptions.Item label="时间">{item.metadata.timestamp}</Descriptions.Item>
                                    )} */}
                                    {item.content && (
                                        <Descriptions.Item label="描述" span={2}>
                                            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{item.content}</pre>
                                        </Descriptions.Item>
                                    )}
                                </Descriptions>
                            </Card>
                        );
                    })
                )}
            </Space>
        </div>
    );
}