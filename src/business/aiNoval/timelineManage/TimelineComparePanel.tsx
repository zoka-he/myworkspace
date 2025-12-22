import { ITimelineDef } from "@/src/types/IAiNoval";
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Typography } from "antd"
import { useSimpleWorldviewContext } from "../common/SimpleWorldviewProvider";
import { useSimpleTimelineProvider } from "../common/SimpleTimelineProvider";
import { useState, useMemo, useEffect } from "react";
import { ReloadOutlined, InfoCircleOutlined } from "@ant-design/icons";
import _ from 'lodash';
import { useSimpleFactionContext } from "../common/SimpleFactionProvider";
import { useTimelineManageContext } from "./timelineManageProvider";
import { TimelineDateFormatter } from "../common/novelDateUtils";

const { Text } = Typography;

export default function TimelineComparePanel() {

    const [sourceSeconds, setSourceSeconds] = useState<number>(0);

    useEffect(() => {
        console.debug(sourceSeconds);
    }, [sourceSeconds]);

    return (
        <div className='f-flex-row'>
            <Space direction="vertical" size={16}>
                <SourceTimelineCard onChange={setSourceSeconds} />
                <TargetTimelineCard sourceSeconds={sourceSeconds} />
            </Space>
            <div className='f-flex-1'>

            </div>
        </div>
    )
}

function SourceTimelineCard({ onChange }: { onChange: (values: number) => void }) {

    const [form] = Form.useForm<{ year: number, month: number, day: number, hour: number }>();
    const { state: worldviewState } = useSimpleWorldviewContext();
    const { state: timelineState, loadTimelineList } = useSimpleTimelineProvider();
    const { state: factionState } = useSimpleFactionContext();
    const [sourceTimelineId, setSourceTimelineId] = useState<number | null>(worldviewState.worldviewData?.base_timeline_id || null);
    
    const [year, setYear] = useState<number | null>(null);
    const [month, setMonth] = useState<number | null>(null);
    const [day, setDay] = useState<number | null>(null);
    const [hour, setHour] = useState<number | null>(null);

    const sourceTimelineOptions = useMemo(() => {

        if (!timelineState.timelineList) return [];

        return _.sortBy(timelineState.timelineList, ['faction_id', 'start_seconds']).map(timeline => {
            let label = timeline.epoch;
            const faction = factionState.factionList.find(faction => faction.id === timeline.faction_id);
            if (faction) {
                label = `【${faction.name}】${label}`;
            }
            return { 
                label, 
                value: timeline.id 
            };
        });
    }, [timelineState.timelineList, factionState.factionList]);

    const title = useMemo(() => {
        return <Space>
            <Text strong>源时间：</Text>
            <Space.Compact>
                <Select value={sourceTimelineId} onChange={setSourceTimelineId} style={{ width: 200 }} options={sourceTimelineOptions}></Select>
                <Button icon={<ReloadOutlined />} onClick={() => loadTimelineList(worldviewState.worldviewId)}></Button>
            </Space.Compact>
        </Space>
    }, [timelineState.timelineList, sourceTimelineId])

    const sourceTimeline = useMemo(() => {
        return timelineState.timelineList.find(timeline => timeline.id === sourceTimelineId);
    }, [timelineState.timelineList, sourceTimelineId]);

    const monthHint = useMemo(() => {
        if (!sourceTimeline) return null;
        return <Text type="warning"> <InfoCircleOutlined /> 月份范围是1~{sourceTimeline?.year_length_in_months}</Text>;
    }, [sourceTimeline]);

    const dayHint = useMemo(() => {
        if (!sourceTimeline) return null;
        return <Text type="warning"> <InfoCircleOutlined /> 日期范围是1~{sourceTimeline?.month_length_in_days}</Text>;
    }, [sourceTimeline]);

    const hourHint = useMemo(() => {
        if (!sourceTimeline) return null;
        return <Text type="warning"> <InfoCircleOutlined /> 小时范围是0~{(sourceTimeline?.day_length_in_hours || 24) - 1}</Text>;
    }, [sourceTimeline]);

    useEffect(() => {
        if (worldviewState.worldviewData?.base_timeline_id) {
            setSourceTimelineId(worldviewState.worldviewData.base_timeline_id);
        }
    }, [worldviewState.worldviewData]);

    useEffect(() => {
        if (worldviewState.worldviewData?.base_timeline_id) {
            setSourceTimelineId(worldviewState.worldviewData.base_timeline_id);
        }
    }, [worldviewState.worldviewData])

    useEffect(() => {
        let offsetYear = 0;
        let offsetMonth = 0;
        let offsetDay = 0;
        let offsetHour = 0;

        if (!sourceTimeline) {
            console.debug('sourceTimeline is null');
            onChange?.(Number.NaN);
            return;
        }

        if (year) {
            if (year > 0) {
                offsetYear = year - 1;
            } else {
                offsetYear = year;
            }
        }

        if (month) {
            if (month > 0 && month <= sourceTimeline.year_length_in_months) {
                offsetMonth = month - 1;
            } else if (month > sourceTimeline.year_length_in_months) {
                offsetMonth = sourceTimeline.year_length_in_months - 1;
            } 
        }

        if (day) {
            if (day > 0 && day <= sourceTimeline.month_length_in_days) {
                offsetDay = day - 1;
            } else if (day > sourceTimeline.month_length_in_days) {
                offsetDay = sourceTimeline.month_length_in_days - 1;
            }
        }

        if (hour) {
            if (hour > 0 && hour < sourceTimeline.day_length_in_hours) {
                offsetHour = hour;
            } else if (hour >= sourceTimeline.day_length_in_hours) {
                offsetHour = sourceTimeline.day_length_in_hours - 1;
            }
        }

        console.debug(offsetYear, offsetMonth, offsetDay, offsetHour);

        const offsetSeconds = 
            sourceTimeline.base_seconds + 
            offsetYear * sourceTimeline.year_length_in_months * sourceTimeline.month_length_in_days * sourceTimeline.day_length_in_hours * sourceTimeline.hour_length_in_seconds + 
            offsetMonth * sourceTimeline.month_length_in_days * sourceTimeline.day_length_in_hours * sourceTimeline.hour_length_in_seconds + 
            offsetDay * sourceTimeline.day_length_in_hours * sourceTimeline.hour_length_in_seconds + 
            offsetHour * sourceTimeline.hour_length_in_seconds;

        onChange?.(offsetSeconds);
    }, [sourceTimeline, year, month, day, hour]);
    
    return (
        <Card title={title}>
            {/** 不知道为什么，反正Form.useForm()不能用，必须硬挂 */}
            <Form form={form}>
                <Form.Item name="year" label="年">
                    <InputNumber style={{ width: 140 }} value={year} onChange={setYear}/>
                    <Text type="warning"> <InfoCircleOutlined /> 负数为纪元前</Text>
                </Form.Item>
                

                <Form.Item name="month" label="月">
                    <InputNumber min={1} max={sourceTimeline?.year_length_in_months || 12} style={{ width: 140 }} value={month} onChange={setMonth}/>
                    {monthHint}
                </Form.Item>

                <Form.Item name="day" label="日">
                    <InputNumber min={1} max={sourceTimeline?.month_length_in_days || 30} style={{ width: 140 }} value={day} onChange={setDay}/>
                    {dayHint}
                </Form.Item>

                <Form.Item name="hour" label="时">
                    <InputNumber min={0} max={sourceTimeline?.day_length_in_hours || 24} style={{ width: 140 }} value={hour} onChange={setHour}/>
                    {hourHint}
                </Form.Item>

            </Form>
        </Card>
    )
}

function TargetTimelineCard({ sourceSeconds }: { sourceSeconds: number }) {
    const { state: timlineManageState } = useTimelineManageContext();
    const { state: timelineState } = useSimpleTimelineProvider();

    let content = [];
    if (timlineManageState.compare_ids.length > 0) {
        content = Array.from(timlineManageState.compare_ids)
            .map(id => {
                return timelineState.timelineList.find(timeline => timeline.id === id) || null;
            })
            .filter(timeline => timeline !== null)
            .map(timeline => {
                return <CovertedTime key={timeline.id} seconds={sourceSeconds} refTimeline={timeline} />
            })
    } else {
        content.push(
            <div key="empty">
                <Text type="secondary">请选择需要转换的时间线</Text>
            </div>
        )
    }

    return (
        <Card title="目标时间">
            <Space direction="vertical" size={16}>
                {content}
            </Space>
        </Card>
    )
}

function CovertedTime({ seconds, refTimeline }: { seconds: number, refTimeline: ITimelineDef }) {

    const timelineName = refTimeline.epoch || `时间线${refTimeline.id}`;

    let dateText = '--';
    if (!_.isNaN(seconds)) {
        dateText = TimelineDateFormatter.fromTimelineDef(refTimeline).formatSecondsToDate(seconds);
    }

    return (
        <Space.Compact>
            <Space.Addon>
                <div style={{ width: '5em' }}>
                    <Text>{timelineName}</Text>
                </div>
            </Space.Addon>
            <Input value={dateText}/>
        </Space.Compact>
    )
}
