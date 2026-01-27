import { useState, useRef, useEffect, useMemo } from 'react';
import fetch from '@/src/fetch';
import { Button, Input, Space, List, message, Card, Row, Col, Typography, Radio, Divider } from 'antd';
import { ExclamationCircleFilled, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import confirm from "antd/es/modal/confirm";
import QueryBar from '@/src/components/queryBar';
import usePagination from '@/src/utils/hooks/usePagination';
import WorldViewInfoEditor from './worldViewInfoEditor';
import { TimelineDefView } from './panel/timelineDefView';
import { TimelineDefEdit } from './edit/timelineDefEdit';
import { IWorldViewDataWithExtra, ITimelineDef, IWorldViewData } from '@/src/types/IAiNoval';
import * as apiCalls from './apiCalls';
import WorldviewManageContextProvider, { useLoadWorldviewList, useWorldViewData, useWorldViewEditorRef, useWorldViewId, useWorldviewList } from './worldviewManageContext';
import { useAsyncEffect } from '@/src/utils/hooks/useAsyncEffect';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import styles from './index.module.scss';

const { Title, Text, Paragraph } = Typography;

/**
 * Converts IWorldViewDataWithExtra to ITimelineDef
 * @param data The IWorldViewDataWithExtra data to convert
 * @returns ITimelineDef or null if no timeline data exists
 */
function convertToTimelineDef(data: IWorldViewDataWithExtra): ITimelineDef | null {
    return {
        id: data.id!,
        worldview_id: data.id!,
        epoch: data.tl_epoch!,
        start_seconds: data.tl_start_seconds!,
        hour_length_in_seconds: data.tl_hour_length_in_seconds!,
        day_length_in_hours: data.tl_day_length_in_hours!,
        month_length_in_days: data.tl_month_length_in_days!,
        year_length_in_months: data.tl_year_length_in_months!
    }
}

export default function WorldViewManage() {
    return (
        <WorldviewManageContextProvider>
            <WorldViewManageContent />
        </WorldviewManageContextProvider>
    )
}

function WorldViewManageContent() {
    const [worldViewId, setWorldViewId] = useWorldViewId();
    const loadWorldviewList = useLoadWorldviewList();
    const mEditor = useRef<WorldViewInfoEditor | null>(null);
    const [worldViewEditorRef, setWorldViewEditorRef] = useWorldViewEditorRef();

    useAsyncEffect(async () => {
        let worldviewList = await loadWorldviewList();
        if (worldviewList && worldviewList.length > 0) {
            setWorldViewId(worldviewList[0].id!);
        }
    }, []);
    
    useEffect(() => {
        setWorldViewEditorRef(mEditor);
    }, [mEditor]);

    function onQuery() {
        loadWorldviewList()
    }

    return (
        <>
            <Row gutter={16}>
                <Col span={6}>
                    <WorldViewListPanel />
                </Col>
                <Col span={18}>
                    <WorldViewInfoPanel />
                </Col>
            </Row> 

            <WorldViewInfoEditor ref={mEditor} onFinish={() => onQuery()}/>
        </> 
    )
}

function WorldViewListPanel() {
    const [worldviewList] = useWorldviewList();
    const loadWorldviewList = useLoadWorldviewList();
    const [searchValue, setSearchValue] = useState('');
    const [worldViewId, setWorldViewId] = useWorldViewId();
    const [mEditorRef, setMEditorRef] = useWorldViewEditorRef();

    const filteredWorldviewList = useMemo(() => worldviewList.filter((item) => {
        return item?.title?.toLowerCase().includes(searchValue.toLowerCase());
    }), [worldviewList, searchValue]);

    let title = (
        <div className="f-flex-two-side">
            <Space>
                <Input placeholder="搜索世界观" prefix={<SearchOutlined/>} onChange={(e) => {setSearchValue(e.target.value);}} />
            </Space>
            <Space>
                <Button type="primary" icon={<ReloadOutlined />} onClick={() => {loadWorldviewList();}}>刷新</Button>
                <Button type="default" icon={<PlusOutlined />} onClick={() => {mEditorRef?.current?.show();}}></Button>
            </Space>
        </div>
    )

    function onDelete(worldViewData: IWorldViewDataWithExtra) {
        confirm({
            title: '删除确认',
            icon: <ExclamationCircleFilled />,
            content: '警告！将删除对象，请二次确认！',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk() {
                fetch.delete('/api/web/aiNoval/worldView', { 
                    params: { id: worldViewData?.id } 
                }).then(() => {
                    message.success('已删除');
                    loadWorldviewList();
                });
            },
        });
    }

    let worldviewListContent = useMemo(() => {

        let options = filteredWorldviewList.map((item) => (
            <Radio key={item.id} className={styles.worldviewListItem} value={item.id}>
                <div className='f-flex-two-side' style={{ alignItems: 'center' }}>
                    <Text>
                        {item?.title || ''}
                    </Text>
                    <Space>
                        <Button type="link" icon={<EditOutlined/>} onClick={() => mEditorRef?.current?.showAndEdit(item as IWorldViewData)}></Button>
                        <Button type="link" danger icon={<DeleteOutlined/>} onClick={() => onDelete(item as IWorldViewDataWithExtra)}></Button>
                    </Space>
                </div>
            </Radio>
        ));

        return <Radio.Group onChange={(e) => {setWorldViewId(e.target.value);}} value={worldViewId}>{options}</Radio.Group>;
    }, [filteredWorldviewList]);

    return (
        <Card title={title} style={{ margin: '12px 0' }}>
            <div className={styles.worldviewListContainer}>
                {worldviewListContent}
            </div>
        </Card>
    )
}

function WorldViewInfoPanel() {
    let [userParams, setUserParams] = useState({});
    let [listData, updateListData] = useState<IWorldViewDataWithExtra[]>([]);
    let [spinning, updateSpinning] = useState(false);
    let [timelineEditOpen, setTimelineEditOpen] = useState(false);
    let pagination = usePagination();
    // let mEditor = useRef<WorldViewInfoEditor | null>(null);

    const [mEditorRef, setMEditorRef] = useWorldViewEditorRef();
    let timelineEditorRef = useRef<{ openAndEdit: (values: ITimelineDef, mode: string) => void } | null>(null);

    const [worldViewData] = useWorldViewData();

    useEffect(() => {
        onQuery();
    }, []);

    useEffect(() => {
        onQuery();
    }, [userParams, pagination.page, pagination.pageSize]);

    async function onQuery() {
        try {
            updateSpinning(true);
            const response = await apiCalls.getWorldViewList((userParams as any).title, pagination.page, pagination.pageSize);
            const { data, count } = (response as any);

            updateListData(data);
            pagination.setTotal(count);

            if (data.length === 0) {
                message.info('数据库中未存在记录！');
            }

        } catch (e:any) {
            console.error(e);
            message.error(e.message);
        } finally {
            updateSpinning(false);
        }
    }

    

    function renderYesNo(cell: string | number | null | undefined) {
        if (cell != null && cell != 0) {
            return <span style={{ color: 'green' }}>是</span>
        } else {
            return <span style={{ color: 'red' }}>否</span>
        }
    }

    const handleTimelineEdit = (worldView: IWorldViewDataWithExtra) => {
        const timelineData = convertToTimelineDef(worldView);
        let timelineEditMode = 'create';

        if (worldView.tl_id) {
            timelineEditMode = 'update';
        }

        if (timelineData) {
            console.log('timelineData [before edit] -->', timelineData);
            timelineEditorRef.current?.openAndEdit(timelineData, timelineEditMode);
        }
        setTimelineEditOpen(true);
    };

    const handleTimelineSave = async (values: ITimelineDef, mode: string) => {
        try {
            if (mode === 'update') {
                await apiCalls.updateTimelineDef(values);
            } else {
                await apiCalls.createTimelineDef(values);
            }

            message.success('时间线定义已更新');
            setTimelineEditOpen(false);
            onQuery();
        } catch (error: any) {
            message.error(error.message || '更新失败');
        }
    };

    return (
        <div className="f-fit-height f-flex-col">
            <Card title="世界观信息" style={{ margin: '12px 0' }}>
                <div className={styles.worldviewInfoContainer}>
                    <Space direction="vertical" size={16}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Title level={3} style={{ margin: 0 }}>{worldViewData?.title || ''}</Title>
                                <Button type="link" icon={<EditOutlined />} onClick={() => mEditorRef?.current?.showAndEdit(worldViewData as IWorldViewData)}>
                                    编辑
                                </Button>
                            </div>

                            {/* <Button type="text" danger icon={<DeleteOutlined />} onClick={() => {
                                confirm({
                                    title: '删除确认',
                                    icon: <ExclamationCircleFilled />,
                                    content: '警告！将删除对象，请二次确认！',
                                    okText: '删除',
                                    okType: 'danger',
                                    cancelText: '取消',
                                    onOk() {
                                        fetch.delete('/api/web/aiNoval/worldView', { 
                                            params: { id: worldViewData?.id } 
                                        }).then(() => {
                                            message.success('已删除');
                                            onQuery();
                                        });
                                    },
                                });
                            }} /> */}
                        </div>

                        <div>
                            <Paragraph>
                                {worldViewData?.content}
                            </Paragraph>
                        </div>
                        
                        <TimelineDefView 
                            data={(worldViewData?.tl_id ? convertToTimelineDef(worldViewData) : undefined)}
                            onEdit={() => worldViewData && handleTimelineEdit(worldViewData)}
                        />

                        <Divider/>

                        <div className='f-flex-two-side'>
                            <div><strong>是否在知识库：</strong> {renderYesNo(worldViewData?.is_dify_knowledge_base)}</div>
                        </div>


                    </Space>
                </div>
            </Card>

            <TimelineDefEdit
                ref={timelineEditorRef}
                open={timelineEditOpen}
                onCancel={() => setTimelineEditOpen(false)}
                onSave={handleTimelineSave}
            />
        </div>
    )
}