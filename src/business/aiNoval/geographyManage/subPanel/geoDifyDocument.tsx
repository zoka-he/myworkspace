import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Typography, Divider, Spin, Col, Row, Button, Space, Modal, Input, Radio, Pagination, message } from 'antd';
import { ClockCircleOutlined, CopyOutlined, FileTextOutlined } from '@ant-design/icons';
import { IGeoGeographyUnitData } from '@/src/types/IAiNoval';
import DifyApi from '@/src/utils/dify/dify_api';
import fetch from '@/src/fetch';
import _ from 'lodash';

const { Title, Text, Paragraph } = Typography;

interface IDifyDocument {
    id?: string;
    name?: string;
    content?: string;
    created_at?: number;
}

interface IGeoDifyDocumentProps {
    worldViewId: number | null;
    geoDataType: string | null;
    geoData?: IGeoGeographyUnitData | null;
}

export default function GeoDifyDocument({ worldViewId, geoDataType, geoData }: IGeoDifyDocumentProps) {

    const [document, setDocument] = useState<IDifyDocument | null>(null);

    const [loading, setLoading] = useState(false);

    const [difyDatasetId, setDifyDatasetId] = useState<string | null>(null);

    const [difyDocumentId, setDifyDocumentId] = useState<string | null>(null);

    const [bindDifyDocumentModalVisible, setBindDifyDocumentModalVisible] = useState(false);

    const [createDifyDocumentModalVisible, setCreateDifyDocumentModalVisible] = useState(false);

    // 当初始化时，更新difyDatasetId
    useEffect(() => {
        if (worldViewId) {
            loadToolConfig(worldViewId).then((res) => {
                setDifyDatasetId(res.geoDatasetId);
            });
        }
    }, []);

    // 当worldViewId变化时，更新difyDatasetId
    useEffect(() => {
        if (worldViewId) {
            loadToolConfig(worldViewId).then((res) => {
                setDifyDatasetId(res.geoDatasetId);
            });
        }
    }, [worldViewId]);

    // 当geoData变化时，更新文档id
    useEffect(() => {
        if (geoData) {
            if (geoData.dify_document_id) {
                setDifyDocumentId(geoData.dify_document_id);
            }

            if (geoData.dify_dataset_id) {
                setDifyDatasetId(geoData.dify_dataset_id);
            }
        } else {
            setDifyDocumentId(null);
            setDifyDatasetId(null);
            console.debug('geoData没有绑定dify文档', geoData);
        }
    }, [geoData]);

    // 当difyDatasetId或者difyDocumentId变化时，更新文档
    useEffect(() => {
        if (difyDatasetId && difyDocumentId) {
            loadDocumentContent(difyDatasetId, difyDocumentId).then((document) => {
                setDocument({
                    id: difyDocumentId,
                    content: document?.content || '',
                    created_at: document?.createdAt || 0,
                });
            });
        }
    }, [difyDatasetId, difyDocumentId]);

    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '400px' 
            }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!geoData) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '400px',
                color: '#999'
            }}>
                <FileTextOutlined style={{ fontSize: '48px', marginRight: '16px' }} />
                <Text type="secondary">暂无文档内容</Text>
            </div>
        );
    }

    // 格式化时间
    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    let documentExist = false || !!document;
    let content = null;

    if (!documentExist) {
        content = (
            <Space>
                <Button onClick={() => setBindDifyDocumentModalVisible(true)}>
                    绑定Dify文档
                </Button>

                <Button type="primary" onClick={() => setCreateDifyDocumentModalVisible(true)}>
                    创建Dify文档
                </Button>
            </Space>
        )
    } else {
        content = (
            <Card 
                style={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
            >
                {/* 上半部分：文档标题和更新时间 */}
                <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Space>
                        <FileTextOutlined style={{ 
                            fontSize: '20px', 
                            color: '#1890ff', 
                            marginRight: '8px' 
                        }} />

                        <div style={{ 
                            display: 'flex',
                            flexDirection: 'row', 
                            alignItems: 'center',
                            color: '#8c8c8c',
                            fontSize: '14px'
                        }}>
                            <ClockCircleOutlined style={{ marginRight: '4px' }} />
                            <Text type="secondary">
                                创建时间：{formatDate(document?.created_at || 0)}
                            </Text>
                        </div>
                    </Space>

                    <Space>
                        <Button onClick={() => setBindDifyDocumentModalVisible(true)}>
                                换绑Dify文档
                            </Button>
                    </Space>
                </div>

                <Divider />

                {/* 下半部分：文档正文 */}
                <div style={{ 
                    flex: 1,
                    overflow: 'auto',
                    padding: '16px 0'
                }}>
                    <div style={{
                        backgroundColor: '#fafafa',
                        padding: '20px',
                        borderRadius: '6px',
                        border: '1px solid #f0f0f0',
                        minHeight: '200px',
                        lineHeight: '1.8'
                    }}>
                        <Paragraph style={{ 
                            margin: 0,
                            fontSize: '14px',
                            color: '#262626',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                        }}>
                            {document?.content || '暂无内容'}
                        </Paragraph>
                    </div>
                </div>
            </Card>
        )
    }

    let difyDocumentDefaultTitle = '';
    if (geoData?.name) {
        let nameBuilder = [`"${geoData?.name}"`];

        let geoTypeMap: Record<string, string> = {
            'starSystem': '恒星系统',
            'star': '恒星',
            'planet': '行星',
            'satellite': '卫星',
        }
        
        switch (geoDataType) {
            case 'star':
            case 'planet':
            case 'satellite':
                nameBuilder.unshift(geoTypeMap[geoDataType as keyof typeof geoTypeMap]);
                break;
            default:
                nameBuilder.unshift("地理位置");
                break;
        }

        nameBuilder.push("设定");

        difyDocumentDefaultTitle = nameBuilder.join("");
    }


    return (
        <>
            {content}

            <BindDifyDocumentModal
                visible={bindDifyDocumentModalVisible}
                worldViewId={worldViewId}
                geoData={geoData}
                geoDataType={geoDataType}
                difyDatasetId={difyDatasetId}
                onCancel={() => setBindDifyDocumentModalVisible(false)}
            />

            <CreateDifyDocumentModal
                visible={createDifyDocumentModalVisible}
                defaultTitle={difyDocumentDefaultTitle}
                defaultContent={geoData?.description}
                onCancel={() => setCreateDifyDocumentModalVisible(false)}
            />
        </>
    );
}


// 绑定Dify文档对话框props
interface IBindDifyDocumentModalProps {
    visible: boolean;
    worldViewId: number | null;
    difyDatasetId: string | null;
    geoData: IGeoGeographyUnitData | null;
    geoDataType: string | null;
    onCancel: () => void;
    onOk: () => void;
}

// 绑定Dify文档对话框
function BindDifyDocumentModal(props: IBindDifyDocumentModalProps) {

    const [documentList, setDocumentList] = useState<IDifyDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [keyword, setKeyword] = useState('');

    const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (props.visible) {
            loadDocumentList();
            setSelectedDocumentId(''); // 重置选择
        }
    }, [props.visible]);

    useEffect(() => {
        setContent('');
        if (props.difyDatasetId && selectedDocumentId) {
            loadDocumentContent(props.difyDatasetId, selectedDocumentId).then((document) => {
                setContent(document?.content || '');
            });
        } 
    }, [selectedDocumentId]);

    async function loadDocumentList(currentPage?: number, currentLimit?: number, currentKeyword?: string | null) {
        if (!props.difyDatasetId) {
            return;
        }

        try {
            setLoading(true);

            const difyApi = new DifyApi();
            let res = await difyApi.getDocumentList(
                props.difyDatasetId, 
                currentPage || page, 
                currentLimit || limit, 
                currentKeyword || keyword
            );

            setDocumentList(res?.data || []);
            setTotal(res?.total || 0);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleSearchInputChange = useMemo(
        () => _.debounce((keyword: string) => {
            setPage(1);
            loadDocumentList(1, limit, keyword);
        }, 300),
        [limit]
    );

    

    const handleBind = async () => {
        if (!selectedDocumentId) {
            message.error('请选择一个文档');
            return;
        }

        if (!props.difyDatasetId) {
            message.error('知识库为空，请检查代码！');
            return;
        }

        if (!props.geoData?.id) {
            message.error('地理对象ID为空，请检查代码！');
            return;
        }

        if (!props.geoDataType) {
            message.error('地理对象类型为空，请检查代码！');
            return;
        }
        
        try {
            await bindDocument(props.geoDataType, props.geoData?.id, props.difyDatasetId, selectedDocumentId);
            message.success('绑定成功');
            props.onOk();
        } catch (error) {
            console.error(error);
            message.error('绑定失败');
        }
    };

    const copyName = (name: string) => {
        setKeyword(name);
        setPage(1);
        loadDocumentList(1, limit, name);
    }

    let title = `绑定Dify文档`;
    if (props.geoData?.name) {
        title = `绑定Dify文档 - ${props.geoData?.name}`;
    }

    return (
        <Modal
            title={
                <>
                    <span>{title}</span>
                    {props.geoData?.name && <Button type="link" onClick={() => copyName(props.geoData?.name || '')}>
                        <CopyOutlined />复制名称
                    </Button>}
                </>
            }
            open={props.visible}
            onCancel={props.onCancel}
            onOk={handleBind}
            okText="绑定"
            cancelText="取消"
            width={'70vw'}
            okButtonProps={{ disabled: !selectedDocumentId }}
        >
            <div style={{ marginBottom: '16px' }}>
                {/* 搜索栏 */}
                <Input.Search
                    placeholder="搜索文档标题"
                    value={keyword}
                    onChange={(e) => {
                        const value = e.target.value;
                        setKeyword(value);
                        handleSearchInputChange(value);
                    }}
                    onSearch={() => {
                        setPage(1);
                        loadDocumentList(1, limit, keyword);
                    }}
                    enterButton
                    allowClear
                    onClear={() => {
                        setKeyword('');
                        setPage(1);
                        loadDocumentList(1, limit, null);
                    }}
                />
            </div>


            <Row gutter={16}>
                <Col span={10}>
                    <div style={{ 
                        marginTop: '16px auto', 
                    }}>
                        <div style={{ 
                            height: '60vh', 
                            overflow: 'auto',
                            border: '1px solid #f0f0f0',
                            borderRadius: '6px',
                            padding: '8px'
                        }}>
                            {loading ? (
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'center', 
                                    alignItems: 'center', 
                                    height: '200px' 
                                }}>
                                    <Spin />
                                </div>
                            ) : documentList.length === 0 ? (
                                <div style={{ 
                                    textAlign: 'center', 
                                    color: '#999', 
                                    padding: '40px 0' 
                                }}>
                                    暂无文档
                                </div>
                            ) : (
                                <Radio.Group 
                                    value={selectedDocumentId} 
                                    onChange={(e) => setSelectedDocumentId(e.target.value)}
                                    style={{ width: '100%', height: '100%' }}
                                >
                                    {documentList.map((doc) => (
                                        <div 
                                            key={doc.id} 
                                            style={{ 
                                                padding: '12px',
                                                borderBottom: '1px solid #f5f5f5',
                                                cursor: 'pointer',
                                                borderRadius: '4px',
                                                marginBottom: '4px',
                                                backgroundColor: selectedDocumentId === doc.id ? '#f6ffed' : 'transparent',
                                                border: selectedDocumentId === doc.id ? '1px solid #b7eb8f' : '1px solid transparent'
                                            }}
                                            onClick={() => setSelectedDocumentId(doc.id)}
                                        >
                                            <Radio value={doc.id} style={{ width: '100%' }}>
                                                <div style={{ marginLeft: '8px' }}>
                                                    <div style={{ 
                                                        fontWeight: 500, 
                                                        color: '#262626',
                                                        marginBottom: '4px'
                                                    }}>
                                                        {doc.name}
                                                    </div>
                                                    <div style={{ 
                                                        fontSize: '12px', 
                                                        color: '#8c8c8c',
                                                        lineHeight: '1.4'
                                                    }}>
                                                        {doc.content?.substring(0, 100)}
                                                        {doc.content && doc.content.length > 100 ? '...' : ''}
                                                    </div>
                                                    <div style={{ 
                                                        fontSize: '12px', 
                                                        color: '#bfbfbf',
                                                        marginTop: '4px'
                                                    }}>
                                                        创建时间: {new Date(Number(doc.created_at) * 1000).toLocaleString('zh-CN')}
                                                    </div>
                                                </div>
                                            </Radio>
                                        </div>
                                    ))}
                                </Radio.Group>
                            )}
                        </div>

                        <Pagination
                            align="end"
                            showSizeChanger
                            onShowSizeChange={(page: number, limit: number) => {
                                setPage(page);
                                setLimit(limit);
                                loadDocumentList(page, limit, keyword);
                            }}
                            current={page}
                            pageSize={limit}
                            total={total}
                            onChange={(page: number, limit: number) => {
                                console.log('onChange', page, limit);
                                setPage(page);
                                setLimit(limit);
                                loadDocumentList(page, limit, keyword);
                            }}
                        />
                    </div>
                </Col>
                <Col span={14}>
                    <div style={{height: '60vh', overflow: 'auto'}}>
                        <Typography.Text style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>
                            {content || selectedDocumentId || '暂无内容'}
                        </Typography.Text>
                    </div>
                </Col>
            </Row>   
            
        </Modal>
    )
}


// 创建Dify文档对话框props
interface ICreateDifyDocumentModalProps {
    visible: boolean;
    defaultTitle?: string | null;
    defaultContent?: string | null;
    onCancel: () => void;
}

// 创建Dify文档对话框
function CreateDifyDocumentModal(props: ICreateDifyDocumentModalProps) {

    const [title, setTitle] = useState(props.defaultTitle || '');
    const [content, setContent] = useState(props.defaultContent || '');

    useEffect(() => {
        if (props.visible) {
            setTitle(props.defaultTitle || '');
            setContent(props.defaultContent || '');
        }
    }, [props.visible]);

    return (
        <Modal
            width={'70vw'}
            title="创建Dify文档"
            open={props.visible}
            onCancel={props.onCancel}
            onOk={() => {
                // TODO: 处理创建逻辑
                props.onCancel();
            }}
            okText="创建"
            cancelText="取消"
        >
            <div style={{ padding: '16px 0' }}>
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ marginBottom: '8px', fontWeight: 500 }}>文档标题</div>
                    <Input placeholder="请输入文档标题" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                    <div style={{ marginBottom: '8px', fontWeight: 500 }}>文档内容</div>
                    <Input.TextArea 
                        placeholder="请输入文档内容" 
                        autoSize={{ minRows: 6 }}
                        showCount
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>
            </div>
        </Modal>
    )
}


async function loadToolConfig(worldViewId: number) {
    let res = await fetch.get('/api/aiNoval/toolConfig/params');

    let geoDatasetId = res?.data?.find((item: any) => item.cfg_name === `DIFY_GEO_DATASET_ID_${worldViewId}`)?.cfg_value_string;

    return {
        geoDatasetId
    }
}

// 加载Dify文档内容
async function loadDocumentContent(difyDatasetId: string, documentId: string) {
    if (!documentId || !difyDatasetId) {
        message.error('文档ID或数据集ID为空，请检查程序');
        return;
    }

    const difyApi = new DifyApi();
    let res = await difyApi.getDocumentContent(
        difyDatasetId, 
        documentId
    );

    let content: string[] = [];
    let createdAt: number = Infinity;
    let updatedAt: number = Infinity;

    let data = res?.data;
    if (data?.length > 0) {
        data.forEach((item: any) => {
            content.push(item.content);
            createdAt = Math.min(createdAt, item.created_at);
            updatedAt = Math.min(updatedAt, item.updated_at);
        });
    }

    return {
        content: content.join('\n\n'),
        createdAt: createdAt,
        updatedAt: updatedAt
    };
}

// 为地理对象绑定Dify文档
async function bindDocument(geoUnitType: string, geoUnitId: number, difyDatasetId: string, difyDocumentId: string) {
    return await fetch.post('/api/aiNoval/geo/bindDocument', {
        geoUnitType,
        geoUnitId,
        difyDatasetId,
        difyDocumentId
    });
}
