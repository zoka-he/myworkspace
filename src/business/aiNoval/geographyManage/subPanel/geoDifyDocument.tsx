import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';import { message } from '@/src/utils/antdAppMessage';

import { Card, Typography, Divider, Spin, Col, Row, Button, Space, Modal, Input, Radio, Pagination, Select } from 'antd';
import { ClockCircleOutlined, CopyOutlined, FileTextOutlined, IssuesCloseOutlined } from '@ant-design/icons';
import { IGeoGeographyUnitData, GEO_UNIT_TYPES } from '@/src/types/IAiNoval';
import DifyApi from '@/src/utils/dify/dify_api';
import fetch from '@/src/fetch';
import _ from 'lodash';
import store from '@/src/store';
import { connect } from 'react-redux';
import { setFrontHost } from '@/src/store/difySlice';

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
    onRequestUpdate?: () => void;
    difyFrontHostOptions: string[];
    difyFrontHost: string;
}

function mapStateToProps(state: any) {
    return {
        difyFrontHostOptions: state.difySlice.difyFrontHostOptions,
        difyFrontHost: state.difySlice.frontHost
    }
}


function GeoDifyDocument({ worldViewId, geoDataType, geoData, onRequestUpdate, difyFrontHostOptions, difyFrontHost }: IGeoDifyDocumentProps) {

    const [document, setDocument] = useState<IDifyDocument | null>(null);

    const [loading, setLoading] = useState(false);

    const [difyDatasetId, setDifyDatasetId] = useState<string | null>(null);

    const [difyDocumentId, setDifyDocumentId] = useState<string | null>(null);

    const [bindDifyDocumentModalVisible, setBindDifyDocumentModalVisible] = useState(false);

    const [createDifyDocumentModalVisible, setCreateDifyDocumentModalVisible] = useState(false);

    const [geoUnitLink, setGeoUnitLink] = useState<any[] | null>(null);

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

    // 当geoData变化时，更新文档id, 并获取地理对象序列
    useEffect(() => {
        let difyDocumentId = null;
        let difyDatasetId = null;

        if (geoData) {
            if (geoData.dify_document_id) {
                difyDocumentId = geoData.dify_document_id;
            }

            if (geoData.dify_dataset_id) {
                difyDatasetId = geoData.dify_dataset_id;
            }
        } 

        // if (!difyDocumentId) {
        //     console.debug('geoData没有绑定dify文档', geoData);
        // } 

        // if ( !difyDatasetId) {
        //     console.debug('geoData没有绑定知识库！', geoData);
        // } 

        setDifyDocumentId(difyDocumentId);
        // setDifyDatasetId(difyDatasetId);


        if (geoData?.id && geoDataType) {
            getGeoUnitLink(geoDataType, geoData.id).then((res) => {
                setGeoUnitLink(res);
            });
        }
    }, [geoData]);

    // 当dify主机、difyDatasetId或者difyDocumentId变化时，更新文档
    useEffect(() => {
        // console.debug('difyDatasetId', difyDatasetId);
        // console.debug('difyDocumentId', difyDocumentId);

        if (difyDatasetId && difyDocumentId) {
            loadDocumentContent(difyFrontHost, difyDatasetId, difyDocumentId).then((document) => {
                setDocument({
                    id: difyDocumentId,
                    content: document?.content || '',
                    created_at: document?.createdAt || 0,
                });
            });
        } else {
            setDocument(null);
        }
    }, [difyDatasetId, difyDocumentId, difyFrontHost]);

    // 删除Dify文档
    const deleteDifyDocument = useCallback(() => {
        console.debug('删除Dify文档', difyDocumentId);

        if (!geoData?.id || !geoDataType) {
            message.error('地理对象ID或类型为空，请检查代码！');
            return;
        }

        if (!difyDatasetId || !difyDocumentId) {
            message.error('知识库或文档ID为空，请检查代码！');
            return;
        }

        Modal.confirm({
            title: '确认删除',
            content: '确定要删除这个文档吗？删除后无法恢复。',
            okText: '确认',
            cancelText: '取消',
            async onOk() {
                try {

                    if (!difyFrontHost) {
                        message.error('Dify主机为空，请检查代码！');
                        return;
                    }

                    if (!store.getState().difySlice.datasetsApiKey ) {
                        message.error('Dify API Key 或 Base URL 为空，请检查代码！');
                        return;
                    }

                    const difyBaseUrl = `http://${difyFrontHost}/v1`;


                    let difyApi = new DifyApi(store.getState().difySlice.datasetsApiKey!, difyBaseUrl);
                    let res = await difyApi.deleteDocument(difyDatasetId, difyDocumentId);

                    bindDocument(geoDataType, geoData!.id!, difyFrontHost, '', '');

                    message.success('删除成功');
                    if (onRequestUpdate) {
                        onRequestUpdate();
                    }


                } catch (error) {
                    message.error('删除失败');
                    console.error(error);
                }
            }
        });
        return;

    }, [difyDatasetId, difyDocumentId, geoData, geoDataType, onRequestUpdate]);

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
                <Text>
                    Dify主机：
                </Text>
                <Select options={difyFrontHostOptions.map(option => ({ label: option, value: option }))} value={difyFrontHost} onChange={e => store.dispatch(setFrontHost(e))} />

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
                        <Button type="primary" onClick={() => setCreateDifyDocumentModalVisible(true)}>
                            修改Dify文档
                        </Button>
                        <Button type="primary" onClick={() => deleteDifyDocument()} danger>
                            删除Dify文档
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

        let nameByCode = false;
        
        switch (geoDataType) {
            case 'star':
            case 'planet':
            case 'satellite':
                nameBuilder.unshift(geoTypeMap[geoDataType as keyof typeof geoTypeMap]);
                break;
            default:
                // nameBuilder.unshift("地理位置");
                nameByCode = true;
                break;
        }

        if (nameByCode) {
            if (geoData?.code) {
                let codeCnName = GEO_UNIT_TYPES.find((item) => item.codePrefix === geoData?.code?.substring(0, 2))?.cnName;
                if (codeCnName) {
                    nameBuilder.unshift(codeCnName);
                } else {
                    nameBuilder.unshift("地理位置");
                }
            }
        }

        nameBuilder.push("设定");

        difyDocumentDefaultTitle = nameBuilder.join("");
    }

    let difyDocumentDefaultContent = '';
    if (geoData?.description) {
        difyDocumentDefaultContent = geoData?.description;
    }

    if (typeof geoUnitLink?.length === "number" &&  geoUnitLink?.length > 0) {
        let geoDesc: string[] = [];
        geoUnitLink.forEach((item: any) => {
            let itemDesc = [];

            if (item.name) {
                itemDesc.push(item.name);
            }

            if (item.geoUnitType) {
                if (item.geoUnitType === "star") {
                    itemDesc.push("恒星");
                } else if (item.geoUnitType === "planet") {
                    itemDesc.push("行星");
                } else if (item.geoUnitType === "satellite") {
                    itemDesc.push("卫星");
                } else if (item.geoUnitType === "geoUnit") {
                    // if (item.type) {
                    //     itemDesc.unshift(GEO_UNIT_TYPES.find((obj) => obj.enName === item.type)?.cnName || "");
                    // }
                } 
            }

            geoDesc.push(itemDesc.join(""));
        });

        if (geoDesc.length > 0) {
            difyDocumentDefaultContent = `位置：${geoDesc.join("，")}\n${difyDocumentDefaultContent}`;
        }
    }

    // console.debug('geoData', geoData);
    // console.debug('difyDocumentDefaultContent', difyDocumentDefaultContent);


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
                onOk={() => {
                    setBindDifyDocumentModalVisible(false);
                    if (onRequestUpdate) {
                        onRequestUpdate();
                    }
                }}
            />

            <CreateOrUpdateDifyDocumentModal
                visible={createDifyDocumentModalVisible}
                defaultTitle={difyDocumentDefaultTitle}
                defaultContent={difyDocumentDefaultContent}
                difyDatasetId={difyDatasetId}
                difyDocumentId={document?.id}
                difyContent={document?.content}
                geoDataType={geoDataType}
                geoData={geoData}
                onCancel={() => setCreateDifyDocumentModalVisible(false)}
                onOk={() => {
                    setCreateDifyDocumentModalVisible(false);
                    if (onRequestUpdate) {
                        onRequestUpdate();
                    }
                }}
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
    difyFrontHostOptions: string[];
    difyFrontHost: string;
}

// 绑定Dify文档对话框
const BindDifyDocumentModal = connect(mapStateToProps)(function BindDifyDocumentModal(props: IBindDifyDocumentModalProps) {

    const [documentList, setDocumentList] = useState<IDifyDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [keyword, setKeyword] = useState('');

    const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
    const [content, setContent] = useState('');

    // 使用 useRef 存储当前状态，避免函数依赖
    const stateRef = useRef({ page: 1, limit: 10, keyword: '' });
    
    // 在 useEffect 中更新 stateRef
    useEffect(() => {
        stateRef.current = { page, limit, keyword };
        // console.log('🔧 [DEBUG] stateRef updated:', stateRef.current);
    }, [page, limit, keyword]);

    // 重置所有状态
    const resetState = useCallback(() => {
        // console.log('🔄 [DEBUG] resetState called');
        setDocumentList([]);
        setLoading(false);
        setPage(1);
        setLimit(10);
        setTotal(0);
        setKeyword('');
        setSelectedDocumentId('');
        setContent('');
        // console.log('✅ [DEBUG] resetState completed');
    }, []);

    // 加载文档列表 - 使用 useRef 避免依赖状态变量
    const loadDocumentList = useCallback(async (difyFrontHost: string, currentPage?: number, currentLimit?: number, currentKeyword?: string | null) => {
        // console.log('📥 [DEBUG] loadDocumentList called with:', { 
        //     currentPage, 
        //     currentLimit, 
        //     currentKeyword, 
        //     difyDatasetId: props.difyDatasetId,
        //     stateRef: stateRef.current 
        // });

        if (!props.difyDatasetId) {
            // console.warn('⚠️ [DEBUG] difyDatasetId is null, skipping loadDocumentList');
            return;
        }

        try {
            // console.log('🔄 [DEBUG] Setting loading to true');
            setLoading(true);

            const difyBaseUrl = `http://${difyFrontHost}/v1`;

            const difyApi = new DifyApi(store.getState().difySlice.datasetsApiKey!, difyBaseUrl);
            // console.log('🌐 [DEBUG] Calling DifyApi.getDocumentList...');
            let res = await difyApi.getDocumentList(
                props.difyDatasetId, 
                currentPage || stateRef.current.page, 
                currentLimit || stateRef.current.limit, 
                currentKeyword || stateRef.current.keyword
            );

            // console.log('📊 [DEBUG] API response:', { 
            //     dataLength: res?.data?.length, 
            //     total: res?.total,
            //     hasData: !!res?.data 
            // });

            setDocumentList(res?.data || []);
            setTotal(res?.total || 0);

        } catch (error) {
            console.error('❌ [DEBUG] loadDocumentList error:', error);
            message.error('加载文档列表失败');
        } finally {
            // console.log('🔄 [DEBUG] Setting loading to false');
            setLoading(false);
        }
    }, [props.difyDatasetId, props.difyFrontHost]);

    // Modal 打开时重置状态并加载数据
    useEffect(() => {
        // console.log('🎯 [DEBUG] Modal visibility effect triggered:', { 
        //     visible: props.visible, 
        //     difyDatasetId: props.difyDatasetId 
        // });
        
        if (props.visible && props.difyDatasetId) {
            // console.log('🚀 [DEBUG] Modal is visible and has difyDatasetId, starting reset and load');
            resetState();
            // 延迟加载，确保状态已重置
            setTimeout(() => {
                // console.log('⏰ [DEBUG] Timeout callback executed, calling loadDocumentList');
                loadDocumentList(props.difyFrontHost);
            }, 0);
        } else {
            // console.log('⏸️ [DEBUG] Modal not visible or no difyDatasetId, skipping reset and load');
        }
    }, [props.visible, props.difyDatasetId]);

    // 当选中文档变化时加载内容
    useEffect(() => {
        // console.log('📄 [DEBUG] Document selection effect triggered:', { 
        //     selectedDocumentId, 
        //     difyDatasetId: props.difyDatasetId 
        // });
        
        if (props.difyDatasetId && selectedDocumentId) {
            // console.log('📖 [DEBUG] Loading document content for:', selectedDocumentId);
            setContent('');
            loadDocumentContent(props.difyFrontHost, props.difyDatasetId, selectedDocumentId).then((document) => {
                // console.log('📄 [DEBUG] Document content loaded:', { 
                //     hasContent: !!document?.content, 
                //     contentLength: document?.content?.length 
                // });
                setContent(document?.content || '');
            });
        } else {
            // console.log('🗑️ [DEBUG] Clearing content - no document selected or no dataset');
            setContent('');
        }
    }, [selectedDocumentId, props.difyDatasetId]);

    // 搜索防抖
    const handleSearchInputChange = useMemo(
        () => _.debounce((searchKeyword: string) => {
            // console.log('🔍 [DEBUG] Search debounced with keyword:', searchKeyword);
            setPage(1);
            loadDocumentList(props.difyFrontHost, 1, stateRef.current.limit, searchKeyword);
        }, 300),
        [loadDocumentList]
    );

    // 绑定文档
    const handleBind = useCallback(async () => {
        // console.log('🔗 [DEBUG] handleBind called with:', { 
        //     selectedDocumentId, 
        //     difyDatasetId: props.difyDatasetId,
        //     geoDataId: props.geoData?.id,
        //     geoDataType: props.geoDataType 
        // });

        if (!props.difyFrontHost) {
            // console.warn('⚠️ [DEBUG] No difyFrontHost');
            message.error('Dify主机为空，请检查代码！');
            return;
        }

        if (!selectedDocumentId) {
            // console.warn('⚠️ [DEBUG] No document selected');
            message.error('请选择一个文档');
            return;
        }

        if (!props.difyDatasetId) {
            // console.warn('⚠️ [DEBUG] No difyDatasetId');
            message.error('知识库为空，请检查代码！');
            return;
        }

        if (!props.geoData?.id) {
            // console.warn('⚠️ [DEBUG] No geoData.id');
            message.error('地理对象ID为空，请检查代码！');
            return;
        }

        if (!props.geoDataType) {
            // console.warn('⚠️ [DEBUG] No geoDataType');
            message.error('地理对象类型为空，请检查代码！');
            return;
        }
        
        try {
            // console.log('🌐 [DEBUG] Calling bindDocument API...');
            await bindDocument(props.geoDataType, props.geoData?.id, props.difyFrontHost, props.difyDatasetId, selectedDocumentId);
            // console.log('✅ [DEBUG] bindDocument successful');
            message.success('绑定成功');
            props.onOk();
        } catch (error) {
            console.error('❌ [DEBUG] bindDocument error:', error);
            message.error('绑定失败');
        }
    }, [selectedDocumentId, props.difyDatasetId, props.geoData?.id, props.geoDataType, props.onOk]);

    // 复制名称
    const copyName = useCallback((name: string) => {
        // console.log('📋 [DEBUG] copyName called with:', name);
        setKeyword(name);
        setPage(1);
        loadDocumentList(props.difyFrontHost, 1, stateRef.current.limit, name);
    }, [loadDocumentList]);

    // 选择文档
    const handleDocumentSelect = useCallback((docId: string | undefined) => {
        // console.log('📝 [DEBUG] handleDocumentSelect called with:', docId);
        if (docId) {
            setSelectedDocumentId(docId);
        }
    }, []);

    // 分页变化
    const handlePageChange = useCallback((newPage: number, newLimit: number) => {
        // console.log('📄 [DEBUG] handlePageChange called:', { newPage, newLimit, currentKeyword: stateRef.current.keyword });
        setPage(newPage);
        setLimit(newLimit);
        loadDocumentList(props.difyFrontHost, newPage, newLimit, stateRef.current.keyword);
    }, [loadDocumentList]);

    // 页面大小变化
    const handlePageSizeChange = useCallback((newPage: number, newLimit: number) => {
        // console.log('📏 [DEBUG] handlePageSizeChange called:', { newPage, newLimit, currentKeyword: stateRef.current.keyword });
        setPage(newPage);
        setLimit(newLimit);
        loadDocumentList(props.difyFrontHost, newPage, newLimit, stateRef.current.keyword);
    }, [loadDocumentList]);

    // 搜索
    const handleSearch = useCallback(() => {
        // console.log('🔍 [DEBUG] handleSearch called with keyword:', stateRef.current.keyword);
        setPage(1);
        loadDocumentList(props.difyFrontHost, 1, stateRef.current.limit, stateRef.current.keyword);
    }, [loadDocumentList]);

    // 清除搜索
    const handleClearSearch = useCallback(() => {
        // console.log('🗑️ [DEBUG] handleClearSearch called');
        setKeyword('');
        setPage(1);
        loadDocumentList(props.difyFrontHost, 1, stateRef.current.limit, null);
    }, [loadDocumentList]);

    // 输入框变化
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // console.log('⌨️ [DEBUG] Input changed to:', value);
        setKeyword(value);
        handleSearchInputChange(value);
    }, [handleSearchInputChange]);

    let title = `绑定Dify文档`;
    if (props.geoData?.name) {
        title = `绑定Dify文档 - ${props.geoData?.name}`;
    }

    // console.log('🎨 [DEBUG] Render state:', {
    //     visible: props.visible,
    //     loading,
    //     documentListLength: documentList.length,
    //     page,
    //     limit,
    //     total,
    //     keyword,
    //     selectedDocumentId,
    //     hasContent: !!content,
    //     stateRef: stateRef.current
    // });

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
            onCancel={() => {
                // console.log('❌ [DEBUG] Modal onCancel triggered');
                props.onCancel();
            }}
            onOk={() => {
                // console.log('✅ [DEBUG] Modal onOk triggered');
                handleBind();
            }}
            okText="绑定"
            cancelText="取消"
            width={'70vw'}
            okButtonProps={{ disabled: !selectedDocumentId }}
            destroyOnClose={true}
        >
            <div style={{ marginBottom: '16px' }}>
                {/* 搜索栏 */}
                <Space.Compact style={{width: '100%'}}>
                    <Select style={{width: '130px'}} options={props.difyFrontHostOptions.map(option => ({ label: option, value: option }))} value={props.difyFrontHost} onChange={e => store.dispatch(setFrontHost(e))} />
                    <Input
                        placeholder="搜索文档标题"
                        value={keyword}
                        onChange={handleInputChange}
                        allowClear
                        onClear={handleClearSearch}
                    />
                    <Button type="primary" onClick={handleSearch}>搜索</Button>
                </Space.Compact>
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
                                    onChange={(e) => {
                                        // console.log('📻 [DEBUG] Radio.Group onChange:', e.target.value);
                                        setSelectedDocumentId(e.target.value);
                                    }}
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
                                            onClick={() => {
                                                // console.log('🖱️ [DEBUG] Document item clicked:', doc.id);
                                                handleDocumentSelect(doc.id);
                                            }}
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
                                // console.log('📏 [DEBUG] Pagination onShowSizeChange:', { page, limit });
                                handlePageSizeChange(page, limit);
                            }}
                            current={page}
                            pageSize={limit}
                            total={total}
                            onChange={(page: number, limit: number) => {
                                // console.log('📄 [DEBUG] Pagination onChange:', { page, limit });
                                handlePageChange(page, limit);
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
})


// 创建Dify文档对话框props
interface ICreateDifyDocumentModalProps {
    visible: boolean;
    defaultTitle?: string | null;
    defaultContent?: string | null;
    difyDatasetId: string | null;
    difyDocumentId?: string | null; 
    difyContent?: string | null;
    geoDataType: string | null;
    geoData: IGeoGeographyUnitData | null;
    onCancel: () => void;
    onOk: () => void;
    difyFrontHostOptions: string[];
    difyFrontHost: string;
}

// 创建Dify文档对话框
const CreateOrUpdateDifyDocumentModal = connect(mapStateToProps)(function CreateOrUpdateDifyDocumentModal(props: ICreateDifyDocumentModalProps) {
    const [title, setTitle] = useState(props.defaultTitle || '');
    const [content, setContent] = useState(props.defaultContent || '');

    const modalMode = props.difyDocumentId ? 'update' : 'create';
    const modalTitle = modalMode === 'update' ? '更新Dify文档' : '创建Dify文档';

    useEffect(() => {
        if (props.visible) {
            setTitle(props.defaultTitle || '');
            setContent(props.difyContent || props.defaultContent || '');
        }
    }, [props.visible, props.defaultTitle, props.defaultContent, props.difyContent]);

    const handleOk = useCallback(async () => {
        if (!props.difyDatasetId) {
            message.error('知识库为空，请检查代码！');
            return;
        }

        if (!title) {
            message.error('文档标题为空，请检查代码！');
            return;
        }

        if (!content) {
            message.error('文档内容为空，请检查代码！');
            return;
        }

        if (!props.geoDataType) {
            message.error('地理对象类型为空，请检查代码！');
            return;
        }

        if (!props.geoData?.id) {
            message.error('地理对象ID为空，请检查代码！');
            return;
        }

        if (!props.difyFrontHost) {
            message.error('Dify主机为空，请检查代码！');
            return;
        }

        try {   
            const difyBaseUrl = `http://${props.difyFrontHost}/v1`;

            const difyApi = new DifyApi(store.getState().difySlice.datasetsApiKey!, difyBaseUrl);

            if (modalMode === 'create') {
                let res = await difyApi.createDocument(props.difyDatasetId, title, content);
                let documentId = res?.document?.id;

                if (!documentId) {
                    message.error('获取文档id失败，请检查代码！');
                    return;
                }

                await bindDocument(props.geoDataType, props.geoData?.id, props.difyFrontHost, props.difyDatasetId, documentId);

                message.success('创建成功');
            } else {
                if (!props.difyDocumentId) {
                    message.error('文档ID为空，请检查代码！');
                    return;
                }

                let res = await difyApi.updateDocument(props.difyDatasetId, props.difyDocumentId, title, content);
                message.success('更新成功');
            }

            props.onOk();
        } catch (error) {
            console.error('❌ [DEBUG] createDocument error:', error);
            message.error('创建失败');
        }
    }, [title, content, props.difyDatasetId, props.difyDocumentId, props.geoDataType, props.geoData?.id, props.onOk]);

    

    return (
        <Modal
            width={'70vw'}
            title={modalTitle}
            open={props.visible}
            onCancel={props.onCancel}
            onOk={handleOk}
            okText={modalMode === 'update' ? '更新' : '创建'}
            cancelText="取消"
        >
            <div style={{ padding: '16px 0' }}>
                <div className='f-flex-two-side'>
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ marginBottom: '8px', fontWeight: 500 }}>Dify主机</div>
                        <Select style={{width: '140px'}} options={props.difyFrontHostOptions.map(option => ({ label: option, value: option }))} value={props.difyFrontHost} onChange={e => store.dispatch(setFrontHost(e))} />
                    </div>
                    <div style={{ marginBottom: '16px', flex: 1, marginLeft: '16px' }}>
                        <div style={{ marginBottom: '8px', fontWeight: 500 }}>文档标题</div>
                        <Input placeholder="请输入文档标题" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                </div>
                
                <div>
                    <div className="f-flex-two-side" style={{ marginBottom: '8px' }}>
                        <span style={{ fontWeight: 500 }}>文档内容</span>
                        <Space>
                            <Button type="primary" size="small" onClick={() => setContent(props.difyContent || '')}>
                                使用Dify文档内容
                            </Button>
                            <Button type="default" size="small" onClick={() => setContent(props.defaultContent || '')}>
                                使用数据库内容
                            </Button>
                        </Space>
                    </div>
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
})


async function loadToolConfig(worldViewId: number) {
    let res = await fetch.get('/api/aiNoval/toolConfig/params');

    let geoDatasetId = res?.data?.find((item: any) => item.cfg_name === `DIFY_GEO_DATASET_ID_${worldViewId}`)?.cfg_value_string;

    return {
        geoDatasetId
    }
}

// 加载Dify文档内容
async function loadDocumentContent(difyFrontHost: string, difyDatasetId: string, documentId: string) {
    if (!documentId || !difyDatasetId) {
        message.error('文档ID或数据集ID为空，请检查程序');
        return;
    }

    let difyBaseUrl = `http://${difyFrontHost}/v1`;

    const difyApi = new DifyApi(store.getState().difySlice.datasetsApiKey!, difyBaseUrl);
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
async function bindDocument(geoUnitType: string, geoUnitId: number, difyFrontHost: string, difyDatasetId: string, difyDocumentId: string) {
    return await fetch.post('/api/aiNoval/geo/bindDocument', {
        geoUnitType,
        geoUnitId,
        difyFrontHost,
        difyDatasetId,
        difyDocumentId
    });
}

// 获取地理对象序列
async function getGeoUnitLink(geoUnitType: string, geoUnitId: number) {
    let res = await fetch.get('/api/aiNoval/geo/parentLink', { 
        params: {
            geoUnitType,
            geoUnitId
        }
    });

    return res?.data;
}

export default connect(mapStateToProps)(GeoDifyDocument);
