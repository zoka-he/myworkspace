import { Card, Space, Button, Input, InputNumber, Tag, Typography, Descriptions } from "antd";
import { useState } from "react";
import { IRoleInfo } from "@/src/types/IAiNoval";
import { SearchOutlined, ClearOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface QueryResult extends IRoleInfo {
    chroma_score?: number;
    db_score?: number;
    combined_score?: number;
}

interface QueryTestPanelProps {
    worldViewId?: number | null;
}

// 生成mock数据
function generateMockData(keywords: string[], threshold: number): QueryResult[] {
    const mockRoles: QueryResult[] = [
        {
            id: 1,
            role_id: 1,
            version_name: 'v1.0',
            worldview_id: 1,
            name_in_worldview: '艾莉亚·星火',
            gender_in_worldview: '女',
            age_in_worldview: '25',
            race_id: 1,
            faction_id: 1,
            background: '来自北境的勇敢战士，从小接受严格的战斗训练，擅长使用双剑。',
            personality: '勇敢、果断、正义感强，但有时过于冲动。',
            chroma_score: 0.85,
            db_score: 0.78,
            combined_score: 0.82,
        },
        {
            id: 2,
            role_id: 2,
            version_name: 'v2.1',
            worldview_id: 1,
            name_in_worldview: '雷克斯·暗影',
            gender_in_worldview: '男',
            age_in_worldview: '32',
            race_id: 2,
            faction_id: 2,
            background: '神秘的魔法师，掌握古老的暗影魔法，曾在魔法学院担任导师。',
            personality: '冷静、智慧、神秘，对魔法研究充满热情。',
            chroma_score: 0.92,
            db_score: 0.88,
            combined_score: 0.90,
        },
        {
            id: 3,
            role_id: 3,
            version_name: 'v1.5',
            worldview_id: 1,
            name_in_worldview: '索伦·铁王',
            gender_in_worldview: '男',
            age_in_worldview: '45',
            race_id: 1,
            faction_id: 3,
            background: '强大的国王，统治着铁王座，以铁血手段维护国家统一。',
            personality: '威严、果断、野心勃勃，但内心孤独。',
            chroma_score: 0.75,
            db_score: 0.82,
            combined_score: 0.78,
        },
        {
            id: 4,
            role_id: 4,
            version_name: 'v1.0',
            worldview_id: 1,
            name_in_worldview: '莉娜·火焰',
            gender_in_worldview: '女',
            age_in_worldview: '28',
            race_id: 3,
            faction_id: 1,
            background: '火焰法师，能够操控强大的火焰魔法，是魔法学院的优秀毕业生。',
            personality: '热情、开朗、充满活力，但有时缺乏耐心。',
            chroma_score: 0.68,
            db_score: 0.65,
            combined_score: 0.66,
        },
        {
            id: 5,
            role_id: 5,
            version_name: 'v2.0',
            worldview_id: 1,
            name_in_worldview: '凯文·守护者',
            gender_in_worldview: '男',
            age_in_worldview: '35',
            race_id: 1,
            faction_id: 1,
            background: '忠诚的骑士，誓死保护王国和人民，是国王最信任的护卫。',
            personality: '忠诚、勇敢、正直，但有时过于固执。',
            chroma_score: 0.58,
            db_score: 0.62,
            combined_score: 0.60,
        },
    ];

    // 根据threshold过滤并排序
    return mockRoles
        .filter(item => (item.combined_score || 0) >= threshold)
        .sort((a, b) => (b.combined_score || 0) - (a.combined_score || 0));
}

export function QueryTestPanel({ worldViewId }: QueryTestPanelProps) {
    const [keywords, setKeywords] = useState<string>('');
    const [threshold, setThreshold] = useState<number>(0.5);
    const [results, setResults] = useState<QueryResult[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    // 处理查询
    const handleQuery = () => {
        if (!keywords.trim()) {
            return;
        }

        const keywordList = keywords
            .split(/[,\n，]/)
            .map(k => k.trim())
            .filter(k => k.length > 0);
        
        if (keywordList.length === 0) {
            return;
        }

        setLoading(true);
        
        // 模拟接口调用延迟
        setTimeout(() => {
            const mockData = generateMockData(keywordList, threshold);
            setResults(mockData);
            setLoading(false);
        }, 500);
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
                        disabled={!keywords.trim()}
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
                                        {item.gender_in_worldview && (
                                            <Tag color="blue">{item.gender_in_worldview}</Tag>
                                        )}
                                        {item.age_in_worldview && (
                                            <Tag color="cyan">{item.age_in_worldview}岁</Tag>
                                        )}
                                    </Space>
                                    <Space>
                                        <Tag color={getScoreColor(item.combined_score || 0)}>
                                            综合: {((item.combined_score || 0) * 100).toFixed(2)}%
                                        </Tag>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            向量: {((item.chroma_score || 0) * 100).toFixed(2)}% | 
                                            数据库: {((item.db_score || 0) * 100).toFixed(2)}%
                                        </Text>
                                    </Space>
                                </div>
                                
                                <Descriptions size="small" column={2} bordered>
                                    <Descriptions.Item label="角色ID">{item.id}</Descriptions.Item>
                                    <Descriptions.Item label="版本名称">{item.version_name || '-'}</Descriptions.Item>
                                    {item.background && (
                                        <Descriptions.Item label="背景" span={2}>
                                            {item.background}
                                        </Descriptions.Item>
                                    )}
                                    {item.personality && (
                                        <Descriptions.Item label="性格" span={2}>
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
