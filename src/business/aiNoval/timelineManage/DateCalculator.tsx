import { Form, Modal, Select, InputNumber, Divider, Button, Typography, Space, Col, Row } from "antd"
import { useTimelineManageContext } from "./timelineManageProvider";
import { useSimpleTimelineProvider } from "../common/SimpleTimelineProvider";
import _ from 'lodash';
import { useMemo, useState } from "react";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useSimpleFactionContext } from "../common/SimpleFactionProvider";

const { Text } = Typography;

interface CalculateResult {
    start_seconds: number;
    year_length_in_months?: number;
    month_length_in_days?: number;
    day_length_in_hours?: number;
    hour_length_in_seconds?: number;
}

interface DateCalculatorProps {
    onCalculateResult: (result: CalculateResult) => void,
}

export default function DateCalculator(props: DateCalculatorProps) {
    const { state: timelineManageState, closeDateCalculator } = useTimelineManageContext();
    const { state: timelineState } = useSimpleTimelineProvider();
    const { state: factionState } = useSimpleFactionContext();

    const [refTimelineId, setRefTimelineId] = useState<number | null>(null);
    const [sendRefTimelineData, setSendRefTimelineData] = useState<boolean>(true);

    const refTimeline = useMemo(() => {
        return timelineState.timelineList.find(timeline => timeline.id === refTimelineId);
    }, [timelineState.timelineList, refTimelineId]);

    const monthHint = useMemo(() => {
        if (!refTimeline) return null;
        return <Text type="warning"><InfoCircleOutlined /> 在该年中，月份范围是1~{refTimeline?.year_length_in_months}</Text>;
    }, [refTimeline]);

    const dayHint = useMemo(() => {
        if (!refTimeline) return null;
        return <Text type="warning"><InfoCircleOutlined /> 在该月中，日期范围是1~{(refTimeline?.month_length_in_days || 24)}</Text>;
    }, [refTimeline]);

    const hourHint = useMemo(() => {
        if (!refTimeline) return null;
        return <Text type="warning"><InfoCircleOutlined /> 在该日中，小时范围是0~{(refTimeline?.day_length_in_hours || 24) - 1}</Text>;
    }, [refTimeline]);

    const [form] = Form.useForm();
    const year = Form.useWatch('year', form);
    const month = Form.useWatch('month', form);
    const day = Form.useWatch('day', form);
    const hour = Form.useWatch('hour', form);

    const calculateYearOffset = useMemo(() => {
        if (year === undefined) return 0;
        if (year === null) return 0;
        if (year <= 0) return year;
        else return year - 1;
    }, [year]);

    const calculateYearBaseSeconds = useMemo(() => {
        if (!refTimeline) return 0;

        return calculateYearOffset * refTimeline.year_length_in_months * refTimeline.month_length_in_days * refTimeline.day_length_in_hours * refTimeline.hour_length_in_seconds;
    }, [refTimeline, calculateYearOffset]);

    const calculateMonthOffset = useMemo(() => {
        if (month === undefined) return 0;
        if (month === null) return 0;
        if (month <= 0) return 0;
        if (refTimeline && month >= refTimeline.year_length_in_months) {
            return refTimeline.year_length_in_months - 1;
        } 
        else return month - 1;
    }, [month, refTimeline]);

    const calculateMonthBaseSeconds = useMemo(() => {
        if (!refTimeline) return 0;

        return calculateMonthOffset * refTimeline.month_length_in_days * refTimeline.day_length_in_hours * refTimeline.hour_length_in_seconds;
    }, [refTimeline, calculateMonthOffset]);

    const calculateDayOffset = useMemo(() => {
        if (day === undefined) return 0;
        if (day === null) return 0;
        if (day <= 0) return 0;
        if (refTimeline && day >= refTimeline.month_length_in_days) {
            return refTimeline.month_length_in_days - 1;
        }
        else return day - 1;
    }, [day, refTimeline]);

    const calculateDayBaseSeconds = useMemo(() => {
        if (!refTimeline) return 0;
        
        return calculateDayOffset * refTimeline.day_length_in_hours * refTimeline.hour_length_in_seconds;
    }, [refTimeline, calculateDayOffset]);

    const calculateHourOffset = useMemo(() => {
        if (hour === undefined) return 0;
        if (hour === null) return 0;
        if (hour <= 0) return 0;
        if (refTimeline && hour >= refTimeline.day_length_in_hours) {
            return refTimeline.day_length_in_hours;
        }
        return hour;
    }, [hour, refTimeline]);

    const calculateHourBaseSeconds = useMemo(() => {
        if (!refTimeline) return 0;
        
        return calculateHourOffset * refTimeline.hour_length_in_seconds;
    }, [refTimeline, calculateHourOffset]);

    const calculateTotalBaseSeconds = useMemo(() => {
        return (refTimeline?.start_seconds || 0) +calculateYearBaseSeconds + calculateMonthBaseSeconds + calculateDayBaseSeconds + calculateHourBaseSeconds;
    }, [refTimeline, calculateYearBaseSeconds, calculateMonthBaseSeconds, calculateDayBaseSeconds, calculateHourBaseSeconds]);

    const calculateDescription = useMemo(() => {
        if (!refTimeline) return <Text>未选择基准时间线，选择后自动计算</Text>;

        return (
            <Typography.Paragraph>
                <blockquote>
                    <Text>纪元偏移量 = {refTimeline.start_seconds}</Text>
                    <br />
                    <Text>年起始秒 = {calculateYearOffset} * {refTimeline.year_length_in_months} * {refTimeline.month_length_in_days} * {refTimeline.day_length_in_hours} * {refTimeline.hour_length_in_seconds} = {calculateYearBaseSeconds}</Text>
                    <br />
                    <Text>月起始秒 = {calculateMonthOffset} * {refTimeline.month_length_in_days} * {refTimeline.day_length_in_hours} * {refTimeline.hour_length_in_seconds} = {calculateMonthBaseSeconds}</Text>
                    <br />
                    <Text>日起始秒 = {calculateDayOffset} * {refTimeline.day_length_in_hours} * {refTimeline.hour_length_in_seconds} = {calculateDayBaseSeconds}</Text>
                    <br />
                    <Text>时起始秒 = {calculateHourOffset} * {refTimeline.hour_length_in_seconds} = {calculateHourBaseSeconds}</Text>
                </blockquote>
                <Text>总起始秒 = {refTimeline.start_seconds} + {calculateYearBaseSeconds} + {calculateMonthBaseSeconds} + {calculateDayBaseSeconds} + {calculateHourBaseSeconds} = {calculateTotalBaseSeconds}</Text>
            </Typography.Paragraph>
        )
    }, [refTimeline, calculateYearBaseSeconds, calculateMonthBaseSeconds, calculateDayBaseSeconds, calculateHourBaseSeconds]);

    const handleCancel = () => {
        closeDateCalculator();
    }

    const handleCalculate = () => {
        closeDateCalculator();
        form.resetFields();
        props?.onCalculateResult({
            start_seconds: calculateTotalBaseSeconds
        });
    }

    const handleCalculateAndSendRefTimelineData = () => {
        if (!refTimeline) return;

        const result: CalculateResult = {
            start_seconds: calculateTotalBaseSeconds,
            year_length_in_months: refTimeline?.year_length_in_months,
            month_length_in_days: refTimeline?.month_length_in_days,
            day_length_in_hours: refTimeline?.day_length_in_hours,
            hour_length_in_seconds: refTimeline?.hour_length_in_seconds
        }

        console.debug("计算结果：", result);

        props?.onCalculateResult(result);

        closeDateCalculator();
        form.resetFields();
    }

    const timelineOptions = useMemo(() => {
        return _.sortBy(timelineState.timelineList, ['faction_id', 'start_seconds'])
            .map(timeline => {
                let label = timeline.epoch;
                const faction = factionState.factionList.find(faction => faction.id === timeline.faction_id);
                if (faction) {
                    label = `【${faction.name}】${label}`;
                }
                return { label, value: timeline.id }
            });
    }, [timelineState.timelineList]);

    return (
        <Modal width="600px" open={timelineManageState.dateCalculatorOpen} title="起始秒计算器"
            onCancel={handleCancel} 
            // onOk={handleCalculate}
            footer={
                <>
                    <Button onClick={() => handleCalculate()}>确定，仅同步起始秒配置</Button>
                    <Button type="primary" disabled={!refTimeline} onClick={handleCalculateAndSendRefTimelineData}>确定，并发送基准时间线配置</Button>
                </>
            }
        >
            <Form form={form} layout="vertical">
                <Divider>1. 选择基准时间线</Divider>
                <Form.Item label="基准时间线" name="timeline_id">
                    <Select options={timelineOptions} onChange={value => setRefTimelineId(value)} />
                </Form.Item>
                <Divider>2. 输入相对日期</Divider>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item label={<Space><Text>年</Text>{<Text type="warning"><InfoCircleOutlined /> 负数为纪元前</Text>}</Space>} name="year" rules={[{ required: true, message: '请输入年份' }]}>
                            <InputNumber style={{ width: '100%' }}/>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label={<Space><Text>月</Text>{monthHint}</Space>} name="month" rules={[{ required: true, message: '请输入月份' }]}>
                            <InputNumber style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item label={<Space><Text>日</Text>{dayHint}</Space>} name="day" rules={[{ required: true, message: '请输入日期' }]}>
                            <InputNumber style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label={<Space><Text>时</Text>{hourHint}</Space>} name="hour" rules={[{ required: true, message: '请输入小时' }]}>
                            <InputNumber style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>
                
                
                <Divider>3. 计算过程</Divider>
                {calculateDescription}
            </Form>
        </Modal>
    )
}