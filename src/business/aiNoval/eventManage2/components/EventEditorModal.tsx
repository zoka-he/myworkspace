'use client';

import { Form, Input, InputNumber, Modal, Select } from "antd";
import { useEffect } from "react";
import type { IFactionDefData, IRoleData, IStoryLine, ITimelineEvent, TimelineEventState } from "@/src/types/IAiNoval";
import { EVENT_STATE_OPTIONS } from "../types";

interface Props {
    open: boolean;
    worldviewId: number | null;
    editingEvent: ITimelineEvent | null;
    storyLines: IStoryLine[];
    factions: IFactionDefData[];
    roles: IRoleData[];
    submitting?: boolean;
    onCancel: () => void;
    onSubmit: (values: ITimelineEvent) => Promise<void>;
}

interface FormValues {
    title: string;
    description: string;
    date: number;
    location: string;
    faction_ids?: number[];
    role_ids?: string[];
    story_line_id: number;
    state: TimelineEventState;
}

export default function EventEditorModal(props: Props) {
    const [form] = Form.useForm<FormValues>();

    useEffect(() => {
        if (!props.open) {
            form.resetFields();
            return;
        }
        if (props.editingEvent) {
            form.setFieldsValue({
                title: props.editingEvent.title,
                description: props.editingEvent.description,
                date: props.editingEvent.date,
                location: props.editingEvent.location,
                faction_ids: props.editingEvent.faction_ids ?? [],
                role_ids: (props.editingEvent.role_ids ?? []).map((id) => String(id)),
                story_line_id: props.editingEvent.story_line_id,
                state: props.editingEvent.state ?? "enabled",
            });
            return;
        }
        form.setFieldsValue({
            title: "",
            description: "",
            date: 0,
            location: "",
            faction_ids: [],
            role_ids: [],
            story_line_id: props.storyLines[0]?.id,
            state: "enabled",
        });
    }, [props.open, props.editingEvent, props.storyLines, form]);

    return (
        <Modal
            title={props.editingEvent ? "编辑事件" : "新增事件"}
            open={props.open}
            onCancel={props.onCancel}
            onOk={async () => {
                const values = await form.validateFields();
                await props.onSubmit({
                    id: props.editingEvent?.id ?? 0,
                    title: values.title,
                    description: values.description,
                    date: values.date,
                    location: values.location,
                    faction_ids: values.faction_ids ?? [],
                    role_ids: values.role_ids ?? [],
                    story_line_id: values.story_line_id,
                    worldview_id: props.worldviewId ?? 0,
                    state: values.state ?? "enabled",
                });
            }}
            okText="保存"
            cancelText="取消"
            confirmLoading={props.submitting}
            width={760}
            destroyOnHidden
        >
            <Form form={form} layout="vertical">
                <Form.Item label="标题" name="title" rules={[{ required: true, message: "请输入标题" }]}>
                    <Input maxLength={200} />
                </Form.Item>
                <Form.Item label="描述" name="description">
                    <Input.TextArea rows={4} />
                </Form.Item>
                <div className="grid grid-cols-2 gap-3">
                    <Form.Item label="时间(秒)" name="date" rules={[{ required: true, message: "请输入时间秒数" }]}>
                        <InputNumber className="w-full" precision={0} />
                    </Form.Item>
                    <Form.Item label="地点编码" name="location">
                        <Input placeholder="如：CT0001" />
                    </Form.Item>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Form.Item label="故事线" name="story_line_id" rules={[{ required: true, message: "请选择故事线" }]}>
                        <Select
                            options={props.storyLines.map((item) => ({ label: item.name, value: item.id }))}
                            placeholder="请选择故事线"
                        />
                    </Form.Item>
                    <Form.Item label="状态" name="state" rules={[{ required: true }]}>
                        <Select options={EVENT_STATE_OPTIONS} />
                    </Form.Item>
                </div>
                <Form.Item label="阵营" name="faction_ids">
                    <Select
                        mode="multiple"
                        options={props.factions.map((item) => ({ label: item.name, value: item.id }))}
                        optionFilterProp="label"
                    />
                </Form.Item>
                <Form.Item label="角色" name="role_ids">
                    <Select
                        mode="multiple"
                        options={props.roles.map((item) => ({ label: item.name ?? item.id, value: String(item.id) }))}
                        optionFilterProp="label"
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}
