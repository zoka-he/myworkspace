import { Card, Space, Button, Input, InputNumber, Tag, Typography, Descriptions, Alert, message } from "antd";
import { useState } from "react";
import { IRoleInfo } from "@/src/types/IAiNoval";
import { SearchOutlined, ClearOutlined, ExclamationCircleOutlined, ManOutlined, WomanOutlined, UserOutlined } from "@ant-design/icons";
import { ApiResponse } from "@/src/types/ApiResponse";
import apiCalls from "../apiCalls";
import { useWorldViewId } from "../roleManageContext";

const { Text } = Typography;

interface QueryResult extends IRoleInfo {
    chroma_score?: number;
    db_score?: number;
    combined_score?: number;
}

interface QueryTestPanelProps {
    // worldViewId?: number | null;
}

export function QueryTestPanel({ }: QueryTestPanelProps) {
    const [worldViewId] = useWorldViewId();
    const [keywords, setKeywords] = useState<string>('');
    const [threshold, setThreshold] = useState<number>(0.5);
    const [results, setResults] = useState<QueryResult[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    // 处理查询
    const handleQuery = async () => {
        if (!keywords.trim()) {
            return;
        }

        if (!worldViewId) {
            message.warning('请先选择世界观');
            return;
        }

        const keywordList = keywords
            .split(/[,\n，]/)
            .map(k => k.trim())
            .filter(k => k.length > 0);
        
        if (keywordList.length === 0) {
            message.warning('请输入至少一个关键词');
            return;
        }

        setLoading(true);
        
        try {
            const response = await apiCalls.findRole(worldViewId, keywordList, threshold);
            const result = response as ApiResponse<QueryResult[]>;
            
            if (result?.success && result.data) {
                setResults(result.data);
                if (result.data.length === 0) {
                    message.info('未找到匹配的角色');
                }
            } else {
                message.error(result?.error || '查询失败');
                setResults([]);
            }
        } catch (error: any) {
            console.error('查询角色失败:', error);
            message.error(error?.message || '查询失败，请稍后重试');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    // 清空表单和结果
    const handleClear = () => {
        setKeywords('');
        setThreshold(0.5);
        setResults([]);
    };

    // 获取分数颜色
    const getScoreColor = (score: number) => {
        if (score >= 0.8) return 'success';
        if (score >= 0.6) return 'processing';
        if (score >= 0.4) return 'warning';
        return 'error';
    };

    // 获取性别图标和颜色
    const getGenderConfig = (gender: string | null | undefined) => {
        if (!gender) return { icon: null, color: 'default' };
        
        const genderLower = gender.toLowerCase();
        if (genderLower.includes('男') || genderLower === 'male' || genderLower === 'm') {
            return { icon: <ManOutlined />, color: 'blue' };
        } else if (genderLower.includes('女') || genderLower === 'female' || genderLower === 'f') {
            return { icon: <WomanOutlined />, color: 'pink' };
        } else if (genderLower.includes('未知') || genderLower === 'unknown' || genderLower === 'unknow') {
            return { icon: <UserOutlined />, color: 'default' };
        }
        return { icon: <UserOutlined />, color: 'default' };
    };

    return (
        <div style={{ padding: '16px' }}>
            {/* Inline 查询表单 */}
            <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
                <Space wrap>
                    <Text strong>关键词：</Text>
                    <Input
                        style={{ width: 400 }}
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        placeholder="请输入关键词，多个关键词可用逗号分隔"
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
                        onChange={(value) => setThreshold(value || 0.5)}
                        placeholder="0.5"
                    />
                    <Button
                        type="primary"
                        icon={<SearchOutlined />}
                        onClick={handleQuery}
                        disabled={!worldViewId || !keywords.trim()}
                        loading={loading}
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
            {results.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">
                        共找到 <Text strong>{results.length}</Text> 条匹配记录
                    </Text>
                </div>
            )}

            {/* 结果卡片列表 */}
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Text type="secondary">查询中...</Text>
                    </div>
                ) : results.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Text type="secondary">暂无数据，请先进行查询</Text>
                    </div>
                ) : (
                    results.map((item) => (
                        <Card
                            key={item.id}
                            size="small"
                            style={{ width: '100%' }}
                        >
                            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Space>
                                        <Text strong style={{ fontSize: '16px' }}>
                                            {item.name_in_worldview || '-'}
                                        </Text>
                                        <Tag>{item.version_name || '-'}</Tag>
                                        {item.gender_in_worldview && (() => {
                                            const genderConfig = getGenderConfig(item.gender_in_worldview);
                                            return (
                                                <Tag color={genderConfig.color} icon={genderConfig.icon}>
                                                    {item.gender_in_worldview}
                                                </Tag>
                                            );
                                        })()}
                                        {item.age_in_worldview && (
                                            <Tag color="cyan">{item.age_in_worldview}岁</Tag>
                                        )}
                                    </Space>
                                    <Space align="end" size="small">
                                        <Space size="small" style={{ marginLeft: 8 }}>
                                            <Tag color={item.chroma_score === 0 ? 'error' : 'default'}>
                                                向量: {((item.chroma_score || 0) * 100).toFixed(2)}%
                                            </Tag>
                                            <Tag color={item.db_score === 0 ? 'error' : 'default'}>
                                                数据库: {((item.db_score || 0) * 100).toFixed(2)}%
                                            </Tag>
                                            <Tag color={getScoreColor(item.combined_score || 0)}>
                                                综合: {((item.combined_score || 0) * 100).toFixed(2)}%
                                            </Tag>
                                            {(item.chroma_score === 0 || item.db_score === 0) && (
                                                <>
                                                    <Text type="secondary">|</Text>
                                                    <Tag color="warning" icon={<ExclamationCircleOutlined />}>
                                                        数据偏斜
                                                    </Tag>
                                                </>
                                            )}
                                        </Space>
                                        
                                    </Space>
                                </div>
                                
                                {(item.chroma_score === 0 || item.db_score === 0) && (
                                    <Alert
                                        message="数据偏斜警告"
                                        description={
                                            item.chroma_score === 0 && item.db_score === 0
                                                ? '向量分数和数据库分数均为0，该结果可能不可靠'
                                                : item.chroma_score === 0
                                                ? '向量分数为0，该角色可能未进行向量化处理'
                                                : '数据库分数为0，该角色可能不在数据库匹配范围内'
                                        }
                                        type="warning"
                                        showIcon
                                        style={{ marginBottom: 8 }}
                                    />
                                )}
                                <Descriptions size="small" column={2} bordered>
                                    {/* <Descriptions.Item label="角色ID">{item.id}</Descriptions.Item> */}


                                    {item.background && (
                                        <Descriptions.Item label="背景" span={2}>
                                            {item.background}
                                        </Descriptions.Item>
                                    )}
                                    {item.personality && (
                                        <Descriptions.Item label="描述" span={2}>
                                            {item.personality}
                                        </Descriptions.Item>
                                    )}
                                </Descriptions>
                            </Space>
                        </Card>
                    ))
                )}
            </Space>
        </div>
    );
}
