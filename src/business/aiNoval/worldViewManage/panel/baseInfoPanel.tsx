import { ITimelineDef, IWorldViewData, IWorldViewDataWithExtra } from "@/src/types/IAiNoval";
import { Space, Button, Divider, Typography, message } from "antd";
import { TimelineDefView } from "./timelineDefView";
import { EditOutlined } from "@ant-design/icons";
import { useWorldViewData, useWorldViewEditorRef, useLoadWorldviewList } from "../worldviewManageContext";
import { useRef, useState } from "react";
import { TimelineDefEdit } from "../edit/timelineDefEdit";
import * as apiCalls from "../apiCalls";

const { Title, Paragraph } = Typography;

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

export default function BaseInfoPanel() {
    const [worldViewData] = useWorldViewData();
    const [mEditorRef, setMEditorRef] = useWorldViewEditorRef();
    let [timelineEditOpen, setTimelineEditOpen] = useState(false);
    let timelineEditorRef = useRef<{ openAndEdit: (values: ITimelineDef, mode: string) => void } | null>(null);
    let loadWorldviewList = useLoadWorldviewList();

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
            loadWorldviewList();
        } catch (error: any) {
            message.error(error.message || '更新失败');
        }
    };

    return (
        <>
            <Space direction="vertical" size={16}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Title level={3} style={{ margin: 0 }}>{worldViewData?.title || ''}</Title>
                        <Button type="link" icon={<EditOutlined />} onClick={() => mEditorRef?.current?.showAndEdit(worldViewData as IWorldViewData)}>
                            编辑
                        </Button>
                    </div>
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

            <TimelineDefEdit
                ref={timelineEditorRef}
                open={timelineEditOpen}
                onCancel={() => setTimelineEditOpen(false)}
                onSave={handleTimelineSave}
            />
        </>
    )
}