import { Form, Input, InputNumber, Select, Button, Space, message, TreeSelect, Col, Row } from "antd";
import { useSimpleFactionContext } from "../common/SimpleFactionProvider";
import { useSimpleWorldviewContext } from "../common/SimpleWorldviewProvider";
import { useSimpleTimelineProvider } from "../common/SimpleTimelineProvider";
import { useTimelineManageContext } from "./timelineManageProvider";
import { ITimelineDef } from "@/src/types/IAiNoval";
import { useEffect } from "react";
import fetch from "@/src/fetch";
import styles from './EditOrCreateTimeline.module.scss';
import DateCalculator from "./DateCalculator";

export default function EditOrCreateTimeline() {
    const { state: factionState } = useSimpleFactionContext();
    const { state: worldviewState } = useSimpleWorldviewContext();
    const { state: timelineState, loadTimelineList } = useSimpleTimelineProvider();
    const { state: timelineManageState, openDateCalculator } = useTimelineManageContext();
    
    const [form] = Form.useForm<ITimelineDef>();

    // 编辑模式时，加载时间线数据
    useEffect(() => {
        if (timelineManageState.mode === 'edit' && timelineState.timelineData) {
            // 使用已有的 timelineData
            form.setFieldsValue(timelineState.timelineData);
        } else if (timelineManageState.mode === 'create') {
            // 创建模式时，重置表单并设置默认的 worldview_id
            form.resetFields();
            if (worldviewState.worldviewId) {
                form.setFieldsValue({ worldview_id: worldviewState.worldviewId });
            }
        }
    }, [timelineManageState.mode, timelineState.timelineData, worldviewState.worldviewId]);

    // 将可选字段的空值转换为 null 的辅助函数
    function convertEmptyToNull(data: any): any {
        const result = { ...data };
        // 需要转换为 null 的可选字段
        const optionalFields = ['faction_id', 'description'];
        
        optionalFields.forEach(field => {
            if (field in result && (result[field] === undefined || result[field] === '')) {
                result[field] = null;
            }
        });
        
        return result;
    }

    async function handleSubmit() {
        try {
            const values = await form.validateFields();
            const worldview_id = worldviewState.worldviewId;
            const timeline_id = timelineManageState.selectedTimelineId;
            
            if (!worldview_id) {
                message.error('世界观ID不能为空');
                return;
            }

            if (timelineManageState.mode === 'edit' && !timeline_id) {
                message.error('编辑状态缺少timeline id')
                return;
            }

            if (timelineManageState.mode === 'create' && timeline_id) {
                message.error('创建状态异常传入timeline id')
                return;
            }

            const submitData: ITimelineDef = {
                ...values,
                worldview_id,
                // 如果是编辑模式，需要包含 id
                ...(timelineManageState.mode === 'edit' && timelineState.timelineData?.id ? { id: timelineState.timelineData.id } : {})
            } as ITimelineDef;

            // 将空值转换为 null
            const processedData = convertEmptyToNull(submitData);

            const url = timelineManageState.mode === 'create' 
                ? '/api/web/aiNoval/timeline' 
                : `/api/web/aiNoval/timeline?id=${timelineState.timelineData?.id}`;
            
            await fetch.post(url, processedData);
            message.success(timelineManageState.mode === 'create' ? '创建成功' : '保存成功');
            
            // 刷新时间线列表
            if (worldviewState.worldviewId) {
                await loadTimelineList(worldviewState.worldviewId);
            }

            // 创建模式下，重置表单
            if (timelineManageState.mode === 'create') {
                form.resetFields();
            }
        } catch (error: any) {
            console.error('Failed to save timeline:', error);
            message.error(error?.message || '保存失败');
        }
    }

    return (
        <>
            
            <Form form={form} layout="vertical" className={styles.editOrCreateTimelineForm}>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="epoch"
                            label="时间线基准点名称"
                            rules={[{ required: true, message: '请输入时间线基准点名称' }]}
                        >
                            <Input placeholder="例如：创世纪元年" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="start_seconds"
                            label="时间线基准点（秒）"
                            rules={[{ required: true, message: '请输入起始时间（秒），负值表示公元前' }]}
                            tooltip="起始时间以秒为单位，负值表示公元前"
                        >
                            <Space.Compact style={{ width: '100%' }}>
                                <Form.Item name="start_seconds" noStyle rules={[{ required: true, message: '请输入起始时间（秒），负值表示公元前' }]}>
                                    <InputNumber style={{ width: '100%' }} placeholder="例如：0 表示公元0年，-31536000 表示公元前1年" />
                                </Form.Item>
                                <Button onClick={() => openDateCalculator()}>计算器</Button>
                            </Space.Compact>
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={6}>
                        <Form.Item
                            name="hour_length_in_seconds"
                            label="标准时长度（秒）"
                            rules={[{ required: true, message: '请输入标准时长度' }]}
                            initialValue={3600}
                        >
                            <InputNumber style={{ width: '100%' }} placeholder="请输入标准时长度（秒）" />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item
                            name="day_length_in_hours"
                            label="标准日长度（时）"
                            rules={[{ required: true, message: '请输入标准日长度' }]}
                            initialValue={24}
                        >
                            <InputNumber style={{ width: '100%' }} placeholder="请输入标准日长度（时）" />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item
                            name="month_length_in_days"
                            label="标准月长度（天）"
                            rules={[{ required: true, message: '请输入标准月长度' }]}
                            initialValue={30}
                        >
                            <InputNumber style={{ width: '100%' }} placeholder="请输入标准月长度（天）" />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item
                            name="year_length_in_months"
                            label="标准年长度（月）"
                            rules={[{ required: true, message: '请输入标准年长度' }]}
                            initialValue={12}
                        >
                            <InputNumber style={{ width: '100%' }} placeholder="请输入标准年长度（月）" />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item
                    name="faction_id"
                    label="所属势力"
                    rules={[{ required: false, message: '请选择所属势力' }]}
                >
                    <TreeSelect
                        placeholder="请选择所属势力"
                        allowClear
                        treeData={factionState.factionTree}
                        showSearch
                        treeNodeFilterProp="title"
                    />
                </Form.Item>

                <Form.Item
                    name="description"
                    label="描述"
                >
                    <Input.TextArea
                        rows={4}
                        placeholder="请输入时间线描述"
                    />
                </Form.Item>

                <Form.Item>
                    <Space>
                        {
                            (timelineManageState.mode === 'edit') ? 
                            <Button type="primary" style={{ fontWeight: 'bold' }} onClick={handleSubmit} danger={timelineManageState.mode === 'edit'}>
                                {`保存到 '${timelineState.timelineData?.epoch}' 时间线`}
                            </Button> :
                            <Button type="primary" onClick={handleSubmit}>创建</Button>
                        }
                        <Button onClick={() => form.resetFields()}>
                            重置
                        </Button>
                    </Space>
                </Form.Item>

                {/* 隐藏字段：worldview_id 和 id */}
                <Form.Item name="worldview_id" hidden>
                    <Input type="hidden" />
                </Form.Item>
                <Form.Item name="id" hidden>
                    <Input type="hidden" />
                </Form.Item>
            </Form>
            <DateCalculator onCalculateResult={(result) => {
                form.setFieldsValue(result);
            }} />
        </>
    )
}