import { Card, Space, Button, Input, InputNumber, Tag, Typography, Descriptions, Alert, message } from "antd";
import { useState } from "react";
import { IGeoUnionData } from "@/src/types/IAiNoval";
import { SearchOutlined, ClearOutlined, ExclamationCircleOutlined, GlobalOutlined, EnvironmentOutlined, RocketOutlined } from "@ant-design/icons";
import { useSimpleWorldviewContext } from "../../../common/SimpleWorldviewProvider";
import { ApiResponse } from "@/src/types/ApiResponse";
import apiCalls from "../../apiCalls";

const { Text } = Typography;

interface QueryResult extends IGeoUnionData {
    chroma_score?: number;
    db_score?: number;
    combined_score?: number;
    rerank_score?: number;
}

interface FindGeoProps {
    // 可以添加其他 props
}

export default function FindGeo({ }: FindGeoProps) {
    const { state: worldviewState } = useSimpleWorldviewContext();
    const worldViewId = worldviewState?.worldviewId;
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
        setResults([]); // 立即清空之前的结果，避免堆积
        
        try {
            const response = await apiCalls.findGeo(worldViewId, keywordList, threshold);
            const result = response as unknown as ApiResponse<QueryResult[]>;
            
            if (result?.success && result.data) {
                setResults(result.data);
                if (result.data.length === 0) {
                    message.info('未找到匹配的地理信息');
                }
            } else {
                message.error(result?.error || '查询失败');
                setResults([]);
            }
        } catch (error: any) {
            console.error('查询地理信息失败:', error);
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

    // 获取地理类型标签配置
    const getGeoTypeConfig = (dataType: string | null | undefined) => {
        const typeMap: Record<string, { name: string; color: string; icon: React.ReactNode }> = {
            starSystem: { name: '恒星系', color: 'purple', icon: <RocketOutlined /> },
            star: { name: '恒星', color: 'orange', icon: <GlobalOutlined /> },
            planet: { name: '行星', color: 'blue', icon: <EnvironmentOutlined /> },
            satellite: { name: '卫星', color: 'cyan', icon: <EnvironmentOutlined /> },
            geographyUnit: { name: '地理单元', color: 'green', icon: <EnvironmentOutlined /> },
        };
        
        if (!dataType) return { name: '未知', color: 'default', icon: <EnvironmentOutlined /> };
        return typeMap[dataType] || { name: dataType, color: 'default', icon: <EnvironmentOutlined /> };
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
                    results.map((item, index) => {
                        const typeConfig = getGeoTypeConfig(item.data_type);
                        return (
                            <Card
                                key={item.code}
                                size="small"
                                style={{ width: '100%' }}
                            >
                                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Space>
                                            <Text strong style={{ fontSize: '16px' }}>
                                                {item.name || '-'}
                                            </Text>
                                            <Tag color={typeConfig.color} icon={typeConfig.icon}>
                                                {typeConfig.name}
                                            </Tag>
                                            {item.code && (
                                                <Tag color="default">编码: {item.code}</Tag>
                                            )}
                                            {item.type && (
                                                <Tag color="geekblue">类型: {item.type}</Tag>
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
                                                <Tag color={getScoreColor(item.rerank_score || 0)}>
                                                    重排: {((item.rerank_score || 0) * 100).toFixed(2)}%
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
                                            message={
                                                item.chroma_score === 0 && item.db_score === 0
                                                    ? '数据偏斜警告：向量分数和数据库分数均为0，该结果可能不可靠'
                                                    : item.chroma_score === 0
                                                    ? '数据偏斜警告：向量分数为0，该地理信息可能未进行向量化处理'
                                                    : '数据偏斜警告：数据库分数为0，该地理信息可能不在数据库匹配范围内'
                                            }
                                            type="warning"
                                            showIcon
                                            style={{ marginBottom: 8 }}
                                        />
                                    )}
                                    <Descriptions size="small" column={2} bordered>
                                        {item.id && (
                                            <Descriptions.Item label="ID">{item.id}</Descriptions.Item>
                                        )}
                                        {item.code && (
                                            <Descriptions.Item label="编码">{item.code}</Descriptions.Item>
                                        )}
                                        {item.data_type && (
                                            <Descriptions.Item label="数据类型">{item.data_type}</Descriptions.Item>
                                        )}
                                        {item.type && (
                                            <Descriptions.Item label="类型">{item.type}</Descriptions.Item>
                                        )}
                                        {item.star_system_id && (
                                            <Descriptions.Item label="所属恒星系ID">{item.star_system_id}</Descriptions.Item>
                                        )}
                                        {/* {item.planet_id && (
                                            <Descriptions.Item label="所属行星ID">{item.planet_id}</Descriptions.Item>
                                        )}
                                        {item.satellite_id && (
                                            <Descriptions.Item label="所属卫星ID">{item.satellite_id}</Descriptions.Item>
                                        )} */}
                                        {/* {item.parent_id && (
                                            <Descriptions.Item label="父级ID">{item.parent_id}</Descriptions.Item>
                                        )} */}
                                        {item.parent_type && (
                                            <Descriptions.Item label="父级类型">{item.parent_type}</Descriptions.Item>
                                        )}
                                        {/* {item.area_coef !== null && item.area_coef !== undefined && (
                                            <Descriptions.Item label="面积系数">{item.area_coef.toFixed(2)}</Descriptions.Item>
                                        )}
                                        {item.children_area_coef !== null && item.children_area_coef !== undefined && (
                                            <Descriptions.Item label="子级面积系数">{item.children_area_coef.toFixed(2)}</Descriptions.Item>
                                        )} */}
                                        {/* {item.has_geo_area && (
                                            <Descriptions.Item label="是否有地理区域">
                                                {item.has_geo_area === 'Y' ? '是' : '否'}
                                            </Descriptions.Item>
                                        )} */}
                                        {item.description && (
                                            <Descriptions.Item label="描述" span={2}>
                                                {item.description}
                                            </Descriptions.Item>
                                        )}
                                    </Descriptions>
                                </Space>
                            </Card>
                        );
                    })
                )}
            </Space>
        </div>
    );
}
