import { useCallback, useEffect, useState } from "react";
import { message } from "@/src/utils/antdAppMessage";
import {
    Button,
    Form,
    Input,
    Modal,
    Slider,
    Space,
    Table,
    Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { IRoleRelationType } from "@/src/types/IAiNoval";
import apiCalls from "../apiCalls";

function strengthTone(strength: number) {
    if (strength <= 30) return { color: "#ff4d4f", text: "偏敌对" };
    if (strength <= 70) return { color: "#faad14", text: "偏中立" };
    return { color: "#52c41a", text: "偏亲密" };
}

export function RoleRelationTypePanel() {
    const [rows, setRows] = useState<IRoleRelationType[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<IRoleRelationType | null>(null);
    const [form] = Form.useForm<{ id: string; label: string; default_strength: number }>();
    const [draftStrength, setDraftStrength] = useState(50);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiCalls.getRoleRelationTypeList(1, 500);
            const list = (res?.data || []) as IRoleRelationType[];
            setRows(
                list.map((r) => ({
                    ...r,
                    id: String(r.id ?? ""),
                    default_strength: Number(r.default_strength ?? 50),
                }))
            );
        } catch {
            message.error("加载关系类型失败");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const openCreate = () => {
        setEditing(null);
        setDraftStrength(50);
        form.resetFields();
        form.setFieldsValue({ id: "", label: "", default_strength: 50 });
        setModalOpen(true);
    };

    const openEdit = (record: IRoleRelationType) => {
        setEditing(record);
        const s = Number(record.default_strength ?? 50);
        setDraftStrength(s);
        form.setFieldsValue({
            id: record.id,
            label: record.label,
            default_strength: s,
        });
        setModalOpen(true);
    };

    const handleDelete = (record: IRoleRelationType) => {
        Modal.confirm({
            title: "确认删除",
            content: `确定删除关系类型「${record.label}」（${record.id}）吗？已引用该类型的角色关系可能受影响。`,
            okType: "danger",
            onOk: async () => {
                try {
                    await apiCalls.deleteRoleRelationType(record.id);
                    message.success("已删除");
                    load();
                } catch {
                    message.error("删除失败");
                }
            },
        });
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            const id = String(values.id).trim();
            const label = String(values.label).trim();
            const default_strength = draftStrength;
            if (!id || !label) {
                message.warning("请填写编码与显示名称");
                return;
            }
            const payload = { id, label, default_strength };
            if (editing) {
                await apiCalls.updateRoleRelationType(payload);
                message.success("已更新");
            } else {
                await apiCalls.createRoleRelationType(payload);
                message.success("已创建");
            }
            setModalOpen(false);
            form.resetFields();
            load();
        } catch (e: any) {
            if (e?.errorFields) return;
            message.error(editing ? "更新失败" : "创建失败");
        }
    };

    const columns: ColumnsType<IRoleRelationType> = [
        {
            title: "编码",
            dataIndex: "id",
            width: 160,
            ellipsis: true,
        },
        {
            title: "显示名称",
            dataIndex: "label",
            ellipsis: true,
        },
        {
            title: "默认亲密度",
            dataIndex: "default_strength",
            width: 220,
            render: (v: number) => {
                const n = Number(v ?? 50);
                const t = strengthTone(n);
                return (
                    <Space align="center" size="small">
                        <Slider
                            style={{ width: 120, margin: 0 }}
                            min={0}
                            max={100}
                            value={n}
                            disabled
                            tooltip={{ formatter: (val) => `${val}` }}
                            trackStyle={{ background: t.color }}
                        />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {n} · {t.text}
                        </Typography.Text>
                    </Space>
                );
            },
        },
        {
            title: "操作",
            key: "actions",
            width: 120,
            render: (_, record) => (
                <Space>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
                        编辑
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record)}
                    >
                        删除
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                维护角色关系类型编码与默认亲密度（0–100：越低越敌对，越高越亲密）。编码对应表{" "}
                <Typography.Text code>role_relations.relation_type</Typography.Text>。
            </Typography.Paragraph>
            <Space style={{ marginBottom: 12 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    新建类型
                </Button>
                <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
                    刷新
                </Button>
            </Space>
            <Table<IRoleRelationType>
                rowKey="id"
                size="small"
                loading={loading}
                columns={columns}
                dataSource={rows}
                pagination={false}
                scroll={{ x: 640 }}
            />
            <Modal
                title={editing ? "编辑关系类型" : "新建关系类型"}
                open={modalOpen}
                onOk={handleModalOk}
                onCancel={() => {
                    setModalOpen(false);
                    form.resetFields();
                    setEditing(null);
                }}
                destroyOnClose
                width={480}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="id"
                        label="编码（英文/下划线，创建后不可改）"
                        rules={[
                            { required: true, message: "请输入编码" },
                            {
                                pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
                                message: "以字母开头，仅字母、数字、下划线",
                            },
                        ]}
                    >
                        <Input placeholder="例如 friend、mentor" disabled={!!editing} autoComplete="off" />
                    </Form.Item>
                    <Form.Item name="label" label="显示名称" rules={[{ required: true, message: "请输入显示名称" }]}>
                        <Input placeholder="界面与报表中展示的名称" />
                    </Form.Item>
                    <Form.Item label="默认亲密度（0–100）">
                        <Slider
                            min={0}
                            max={100}
                            value={draftStrength}
                            onChange={setDraftStrength}
                            trackStyle={{
                                background: strengthTone(draftStrength).color,
                            }}
                        />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {draftStrength} — {strengthTone(draftStrength).text}
                        </Typography.Text>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
