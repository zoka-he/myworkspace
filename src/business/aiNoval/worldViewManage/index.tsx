import { useState, useRef, useEffect } from 'react';
import fetch from '@/src/fetch';
import { Button, Input, Space, List, message, Card } from 'antd';
import { ExclamationCircleFilled, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import confirm from "antd/es/modal/confirm";
import QueryBar from '@/src/components/queryBar';
import usePagination from '@/src/utils/hooks/usePagination';
import WorldViewInfoEditor from './worldViewInfoEditor';
import { TimelineDefView } from './panel/timelineDefView';
import { TimelineDefEdit } from './edit/timelineDefEdit';
import { IWorldViewDataWithExtra, ITimelineDef, IWorldViewData } from '@/src/types/IAiNoval';
import * as apiCalls from './apiCalls';

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
    let [userParams, setUserParams] = useState({});
    let [listData, updateListData] = useState<IWorldViewDataWithExtra[]>([]);
    let [spinning, updateSpinning] = useState(false);
    let [timelineEditOpen, setTimelineEditOpen] = useState(false);
    let pagination = usePagination();
    let mEditor = useRef<WorldViewInfoEditor>();
    let timelineEditorRef = useRef<{ openAndEdit: (values: ITimelineDef, mode: string) => void }>();

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
            const { data, count } = response;

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

    function onCreateAccount() {
        mEditor.current?.show();
    }

    function renderAction(row: IWorldViewDataWithExtra) {
        function onEdit() {
            mEditor.current?.showAndEdit(row);
        }

        const deleteRow = async () => {
            await fetch.delete(
                '/api/web/aiNoval/worldView', 
                { 
                    params: { 
                        id: row.id,
                    } 
                }
            );

            message.success('已删除');
            onQuery();
        }

        const showDeleteConfirm = () => {
            confirm({
                title: '删除确认',
                icon: <ExclamationCircleFilled />,
                content: '警告！将删除对象，请二次确认！',
                okText: '删除',
                okType: 'danger',
                cancelText: '取消',
                onOk() {
                    deleteRow();
                },
                onCancel() {
                    console.log('Cancel');
                },
            });
        };

        return (
            <Space>
                <Button type="link" icon={<EditOutlined />} onClick={onEdit}>
                    编辑
                </Button>
                <Button type="text" danger icon={<DeleteOutlined />} onClick={showDeleteConfirm} />
            </Space>
        );
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
            <div className="f-flex-two-side">
                <QueryBar onChange={onQuery} spinning={spinning}>
                    <QueryBar.QueryItem name="title" label="世界观">
                        <Input allowClear/>
                    </QueryBar.QueryItem>

                    <QueryBar.QueryItem name="content" label="摘要">
                        <Input allowClear/>
                    </QueryBar.QueryItem>
                </QueryBar>

                <Space>
                    <Button type={'primary'} onClick={onCreateAccount}>新增</Button>
                </Space>
            </div>

            <Card title="世界观列表" style={{ margin: '12px 0' }}>
                <List
                    grid={{ gutter: 16, column: 1 }}
                    dataSource={listData}
                    pagination={{
                        current: pagination.page,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `共 ${total} 个记录`,
                        onChange: (page, pageSize) => {
                            pagination.setPage(page);
                            pagination.setPageSize(pageSize);
                        }
                    }}
                    renderItem={(item) => (
                        <List.Item>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h3 style={{ margin: 0 }}>{item.title}</h3>
                                        <Button type="link" icon={<EditOutlined />} onClick={() => mEditor.current?.showAndEdit(item)}>
                                            编辑
                                        </Button>
                                    </div>
                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => {
                                        confirm({
                                            title: '删除确认',
                                            icon: <ExclamationCircleFilled />,
                                            content: '警告！将删除对象，请二次确认！',
                                            okText: '删除',
                                            okType: 'danger',
                                            cancelText: '取消',
                                            onOk() {
                                                fetch.delete('/api/web/aiNoval/worldView', { 
                                                    params: { id: item.id } 
                                                }).then(() => {
                                                    message.success('已删除');
                                                    onQuery();
                                                });
                                            },
                                        });
                                    }} />
                                </div>
                                <div>
                                    <p style={{ marginBottom: 8 }}>{item.content}</p>
                                    <div><strong>是否在知识库：</strong> {renderYesNo(item.is_dify_knowledge_base)}</div>
                                </div>
                                <TimelineDefView 
                                    data={item.tl_id ? convertToTimelineDef(item) : undefined}
                                    onEdit={() => handleTimelineEdit(item)}
                                />
                            </div>
                        </List.Item>
                    )}
                />
            </Card>

            {/* @ts-ignore */}
            <WorldViewInfoEditor ref={mEditor} onFinish={() => onQuery()}/>

            <TimelineDefEdit
                ref={timelineEditorRef}
                open={timelineEditOpen}
                onCancel={() => setTimelineEditOpen(false)}
                onSave={handleTimelineSave}
            />
        </div>
    )
}