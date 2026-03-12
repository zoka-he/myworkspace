import { Modal, Form, Input, Select, Transfer, Col, Row, Button, Typography, Space } from 'antd';
import { IRoleGroup, IRoleGroupMember, ROLE_GROUP_TYPES, ROLE_GROUP_STATUSES } from '@/src/types/IAiNoval';
import { useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { useWorldViewId } from '../RoleGroupManageContext';
import apiCalls from '../apiCalls';
import roleApiCalls from '@/src/business/aiNoval/roleManage/apiCalls';
import { IRoleInfo } from '@/src/types/IAiNoval';

const { TextArea } = Input;
const { Text } = Typography;

interface RoleGroupEditProps {
    onSuccess?: () => void;
}

export interface RoleGroupEditRef {
    showAndEdit: (group: Partial<IRoleGroup> | null) => void;
    resetForm: () => void;
}

const RoleGroupEdit = forwardRef<RoleGroupEditRef, RoleGroupEditProps>(({ onSuccess }, ref) => {
    const [form] = Form.useForm();
    const [visible, setVisible] = useState(false);
    const [worldViewId] = useWorldViewId();
    const [roleInfoList, setRoleInfoList] = useState<IRoleInfo[]>([]);
    const [loadingRoleInfo, setLoadingRoleInfo] = useState(false);
    const [saving, setSaving] = useState(false);
    const [targetKeys, setTargetKeys] = useState<string[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);

    const loadRoleInfoList = async () => {
        if (!worldViewId) return;
        setLoadingRoleInfo(true);
        try {
            const res = await roleApiCalls.getWorldViewRoleInfoList(worldViewId, 500);
            const data = (res as { data?: IRoleInfo[] })?.data || [];
            setRoleInfoList(data);
        } finally {
            setLoadingRoleInfo(false);
        }
    };

    useEffect(() => {
        if (visible && worldViewId) loadRoleInfoList();
    }, [visible, worldViewId]);

    useImperativeHandle(ref, () => ({
        showAndEdit: (group: Partial<IRoleGroup> | null) => {
            form.resetFields();
            setEditingId(group?.id ?? null);
            if (group?.id) {
                form.setFieldsValue({
                    name: group.name,
                    description: group.description,
                    collective_behavior: group.collective_behavior,
                    group_type: group.group_type ?? '',
                    group_status: group.group_status ?? 'active',
                    sort_order: group.sort_order ?? 0,
                    decision_style: group.decision_style ?? '',
                    group_style: group.group_style ?? '',
                    conflict_points: group.conflict_points ?? '',
                    accord_points: group.accord_points ?? '',
                    action_pattern: group.action_pattern ?? '',
                    shared_goal: group.shared_goal ?? '',
                    taboo: group.taboo ?? '',
                    situation_responses: group.situation_responses ?? '',
                    group_mannerisms: group.group_mannerisms ?? '',
                    group_type_notes: group.group_type_notes ?? '',
                    status_since: group.status_since != null ? String(group.status_since) : '',
                    status_notes: group.status_notes ?? '',
                });
                const memberIds = (group.members || []).map((m) => String(m.role_info_id));
                setTargetKeys(memberIds);
            } else {
                form.setFieldsValue({
                    group_status: 'active',
                    sort_order: 0,
                });
                setTargetKeys([]);
            }
            setVisible(true);
        },
        resetForm: () => {
            form.resetFields();
            setTargetKeys([]);
        },
    }));

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            const members = targetKeys.map((id, i) => ({
                role_info_id: Number(id),
                sort_order: i,
            }));
            const payload = {
                ...values,
                worldview_id: worldViewId,
                members,
            };
            if (editingId) {
                await apiCalls.updateRoleGroup({ ...payload, id: editingId });
            } else {
                await apiCalls.createRoleGroup(payload);
            }
            setVisible(false);
            onSuccess?.();
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setVisible(false);
    };

    const roleInfoDataSource = roleInfoList.map((r) => ({
        key: String(r.id),
        title: r.name_in_worldview || `角色 ${r.id}`,
    }));

    const appendQuickText = (field: 'group_type' | 'group_status', text: string) => {
        console.debug('appendQuickText', field, text);
        const prev = (form.getFieldValue(field) as string) || '';
        const next = prev ? `${prev.trim()}\n${text}` : text;
        form.setFieldsValue({ [field]: next });
    };

    return (
        <Modal
            title="编辑角色组"
            open={visible}
            onOk={handleOk}
            onCancel={handleCancel}
            width={'80vw'}
            confirmLoading={saving}
            destroyOnHidden
            
        >
            <Form form={form} layout="vertical" preserve={false}>
                
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="name" label="名称" rules={[{ required: true }]}>
                            <Input placeholder="角色组名称" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="group_status" label="状态" rules={[{ required: true }]}>
                            <Select placeholder="选择状态" options={ROLE_GROUP_STATUSES} />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item label="类型">
                    <Space style={{ marginBottom: 8 }}>
                        {ROLE_GROUP_TYPES.map((t) => (
                            <Button
                                key={t.value}
                                size="small"
                                onClick={() => appendQuickText('group_type', t.label)}
                            >
                                {t.label}
                            </Button>
                        ))}
                    </Space>
                    <Form.Item name="group_type" noStyle>
                        <TextArea
                            autoSize={{ minRows: 2 }}
                            placeholder="例如：固定小队 / 任务小组 / 敌对组合等，可自由描述"
                        />
                    </Form.Item>
                </Form.Item>

                <Form.Item name="description" label="描述">
                    <TextArea autoSize={{ minRows: 2 }} placeholder="简要描述" />
                </Form.Item>

                <Form.Item name="collective_behavior" label="集体行动说明">
                    <TextArea autoSize={{ minRows: 3 }} placeholder="小组如何配合、习惯流程等" />
                </Form.Item>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="decision_style" label="决策方式">
                            <TextArea autoSize={{ minRows: 2 }} placeholder="如：多数决、领队拍板、共识、否决权等" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="group_style" label="小组风格/节奏">
                            <TextArea autoSize={{ minRows: 2 }} placeholder="如：谨慎型/冲动型、快节奏/谋定后动等" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="conflict_points" label="冲突点">
                            <TextArea autoSize={{ minRows: 2 }} placeholder="在哪些事上容易分歧" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="accord_points" label="默契点">
                            <TextArea autoSize={{ minRows: 2 }} placeholder="在哪些事上高度一致" />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item name="action_pattern" label="常见行动模式/剧本">
                    <TextArea autoSize={{ minRows: 2 }} placeholder="遇事谁先发言、谁拍板、谁执行、谁收尾等" />
                </Form.Item>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="shared_goal" label="共同目标">
                            <TextArea autoSize={{ minRows: 2 }} placeholder="小组当前/长期的共同目标" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="taboo" label="小组禁忌">
                            <TextArea autoSize={{ minRows: 2 }} placeholder="这组人绝不会做的事" />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item name="situation_responses" label="情境-典型反应">
                    <TextArea
                        autoSize={{ minRows: 2 }}
                        placeholder="可写为 key -> 行动，如：遭遇强敌 -> A评估，B掩护，C交涉"
                    />
                </Form.Item>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="group_mannerisms" label="对外一致口径/习惯用语">
                            <TextArea autoSize={{ minRows: 2 }} placeholder="小组对外的一致说法、口头禅等" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="group_type_notes" label="类型备注">
                            <TextArea autoSize={{ minRows: 2 }} placeholder="当类型为“其他”时的补充说明" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="status_since" label="状态起始时间/剧情节点">
                            <Input placeholder="如：第 12 章后 / 时间线秒数等" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="status_notes" label="状态说明">
                            <TextArea autoSize={{ minRows: 2 }} placeholder="如：解散原因、休眠原因等" />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item name="sort_order" label="排序">
                    <Input type="number" />
                </Form.Item>
                <Form.Item label="成员（从左侧选入）">
                    <Transfer
                        // style={{ width: '100%' }}
                        dataSource={roleInfoDataSource}
                        titles={['可选角色', '已选成员']}
                        targetKeys={targetKeys}
                        onChange={(keys) => setTargetKeys(keys as string[])}
                        render={(item) => item.title}
                        listStyle={{ width: '100%', height: 600 }}
                        showSearch
                        filterOption={(input, item) => (item.title ?? '').toLowerCase().includes(input.toLowerCase())}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
});

RoleGroupEdit.displayName = 'RoleGroupEdit';

export default RoleGroupEdit;
