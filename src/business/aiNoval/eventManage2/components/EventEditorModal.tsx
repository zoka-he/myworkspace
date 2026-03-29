'use client';

import { Alert, Form, Input, InputNumber, Modal, Select, Spin } from "antd";
import { useEffect, useMemo } from "react";
import useSWR from "swr";
import { getTimelineEvent } from "@/src/api/aiNovel";
import type { ITimelineEvent, TimelineEventState } from "@/src/types/IAiNoval";
import { message } from "@/src/utils/antdAppMessage";
import { useFactions, useRoles, useStoryLines, normalizeTimelineEvent } from "../hooks";
import { EVENT_STATE_OPTIONS } from "../types";

interface Props {
    open: boolean;
    /** 新建时必填；编辑时以接口返回的 worldview_id 为准 */
    worldviewId: number | null;
    /** 有值表示编辑，弹窗内会按 id 拉取详情 */
    eventId: number | null;
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
    const isEdit = props.eventId != null && props.eventId > 0;

    const fetchEventId = props.open && isEdit && props.eventId != null ? props.eventId : null;
    const {
        data: loadedEvent,
        error: loadError,
        isLoading: isLoadingEvent,
    } = useSWR(
        fetchEventId != null ? (["event-editor-timeline-event", fetchEventId] as const) : null,
        async ([, id]) => {
            const raw = await getTimelineEvent(id);
            return normalizeTimelineEvent(raw);
        }
    );

    const effectiveWorldviewId = useMemo(() => {
        if (isEdit) {
            return loadedEvent?.worldview_id ?? null;
        }
        return props.worldviewId;
    }, [isEdit, loadedEvent?.worldview_id, props.worldviewId]);

    const { data: storyLines = [] } = useStoryLines(effectiveWorldviewId);
    const { data: factions = [] } = useFactions(effectiveWorldviewId);
    const { data: roles = [] } = useRoles(effectiveWorldviewId);

    useEffect(() => {
        if (!props.open) {
            form.resetFields();
            return;
        }
        if (isEdit) {
            if (!loadedEvent) return;
            form.setFieldsValue({
                title: loadedEvent.title,
                description: loadedEvent.description,
                date: loadedEvent.date,
                location: loadedEvent.location,
                faction_ids: loadedEvent.faction_ids ?? [],
                role_ids: (loadedEvent.role_ids ?? []).map((id) => String(id)),
                story_line_id: loadedEvent.story_line_id,
                state: loadedEvent.state ?? "enabled",
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
            story_line_id: storyLines[0]?.id,
            state: "enabled",
        });
    }, [props.open, isEdit, loadedEvent, storyLines, form]);

    const editBlocked = isEdit && (isLoadingEvent || !!loadError || !loadedEvent);
    const saveBlocked = editBlocked || !effectiveWorldviewId;

    return (
        <Modal
            title={isEdit ? "编辑事件" : "新增事件"}
            open={props.open}
            onCancel={props.onCancel}
            onOk={async () => {
                if (!effectiveWorldviewId) {
                    message.warning(isEdit ? "事件数据未加载完成" : "请先选择世界观");
                    return;
                }
                const values = await form.validateFields();
                await props.onSubmit({
                    id: isEdit ? (loadedEvent?.id ?? props.eventId ?? 0) : 0,
                    title: values.title,
                    description: values.description,
                    date: values.date,
                    location: values.location,
                    faction_ids: values.faction_ids ?? [],
                    role_ids: values.role_ids ?? [],
                    story_line_id: values.story_line_id,
                    worldview_id: effectiveWorldviewId,
                    state: values.state ?? "enabled",
                });
            }}
            okText="保存"
            cancelText="取消"
            confirmLoading={props.submitting}
            okButtonProps={{ disabled: saveBlocked }}
            width={760}
            destroyOnHidden
        >
            {loadError ? (
                <Alert
                    type="error"
                    showIcon
                    message="加载事件失败"
                    description={loadError instanceof Error ? loadError.message : "请稍后重试"}
                    className="mb-3"
                />
            ) : null}
            <Spin spinning={isEdit && isLoadingEvent}>
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
                                options={storyLines.map((item) => ({ label: item.name, value: item.id }))}
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
                            options={factions.map((item) => ({ label: item.name, value: item.id }))}
                            optionFilterProp="label"
                        />
                    </Form.Item>
                    <Form.Item label="角色" name="role_ids">
                        <Select
                            mode="multiple"
                            options={roles.map((item) => ({
                                label: item.name ?? item.id,
                                value: String(item.id),
                            }))}
                            optionFilterProp="label"
                        />
                    </Form.Item>
                </Form>
            </Spin>
        </Modal>
    );
}
