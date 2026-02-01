import { Modal, Form, Input, TreeSelect, Select, message, Space, Button, Divider } from 'antd';
import { IFactionDefData } from '@/src/types/IAiNoval';
import { useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { useWorldViewId, useFactionTree, useWorldViewList, useLoadFactionList } from '../FactionManageContext';
import apiCalls from '../apiCalls';
import { generateFactionEmbedText } from '@/src/api/aiNovel';
import { EditOutlined } from '@ant-design/icons';

interface IFactionEditProps {
    // onCancel: () => void;
    // onOk: (values: IFactionDefData) => void;
    initialValues?: IFactionDefData;
}

export interface FactionEditRef {
    setFormValues: (values: IFactionDefData) => void;
    resetForm: () => void;
    showAndEdit: (values: IFactionDefData) => void;
}

const SCALE_OF_OPERATION_OPTIONS = [
    { value: '地区级', label: '地区级' },
    { value: '大陆级', label: '大陆级' },
    { value: '行星级', label: '行星级' },
    { value: '多星级', label: '多星级' },
    { value: '文明级', label: '文明级' },
];

const FactionEdit = forwardRef<FactionEditRef, IFactionEditProps>(({
    // onCancel,
    // onOk,
    initialValues
}, ref) => {
    const [form] = Form.useForm();
    const [backupData, setBackupData] = useState<Partial<IFactionDefData>>({});
    const [visible, setVisible] = useState(false);
    const [embedLoading, setEmbedLoading] = useState(false);
    const [worldViewId] = useWorldViewId();
    const [factionTree] = useFactionTree();
    const [worldViewList] = useWorldViewList();
    const loadFactionList = useLoadFactionList();

    useImperativeHandle(ref, () => ({
        setFormValues: (values: IFactionDefData) => {
            // Backup the external data
            setBackupData(values);
            // Only set form values for fields that are in the form
            const formValues = {
                worldview_id: worldViewId,
                parent_id: values.parent_id,
                name: values.name,
                description: values.description,
                embed_document: values.embed_document,
                faction_type: values.faction_type,
                faction_culture: values.faction_culture,
                ideology_or_meme: values.ideology_or_meme,
                scale_of_operation: values.scale_of_operation,
                decision_taboo: values.decision_taboo,
                primary_threat_model: values.primary_threat_model,
                internal_contradictions: values.internal_contradictions,
                legitimacy_source: values.legitimacy_source,
                known_dysfunctions: values.known_dysfunctions,
                geo_naming_habit: values.geo_naming_habit,
                geo_naming_suffix: values.geo_naming_suffix,
                geo_naming_prohibition: values.geo_naming_prohibition,
            };
            form.setFieldsValue(formValues);
        },
        resetForm: () => {
            form.resetFields();
            setBackupData({});
        },
        showAndEdit: (values: IFactionDefData) => {
            setVisible(true);
            setBackupData(values);
            // Only set form values for fields that are in the form
            const formValues = {
                id: values.id,
                worldview_id: worldViewId,
                parent_id: values.parent_id,
                name: values.name,
                description: values.description,
                embed_document: values.embed_document,
                faction_type: values.faction_type,
                faction_culture: values.faction_culture,
                ideology_or_meme: values.ideology_or_meme,
                scale_of_operation: values.scale_of_operation,
                decision_taboo: values.decision_taboo,
                primary_threat_model: values.primary_threat_model,
                internal_contradictions: values.internal_contradictions,
                legitimacy_source: values.legitimacy_source,
                known_dysfunctions: values.known_dysfunctions,
                geo_naming_habit: values.geo_naming_habit,
                geo_naming_suffix: values.geo_naming_suffix,
                geo_naming_prohibition: values.geo_naming_prohibition,
            };
            form.setFieldsValue(formValues);
        }
    }));

    useEffect(() => {
        if (visible && initialValues) {
            setBackupData(initialValues);
            form.setFieldsValue({
                name: initialValues.name,
                description: initialValues.description,
                faction_type: initialValues.faction_type,
                faction_culture: initialValues.faction_culture,
                ideology_or_meme: initialValues.ideology_or_meme,
                scale_of_operation: initialValues.scale_of_operation,
                decision_taboo: initialValues.decision_taboo,
                primary_threat_model: initialValues.primary_threat_model,
                internal_contradictions: initialValues.internal_contradictions,
                legitimacy_source: initialValues.legitimacy_source,
                known_dysfunctions: initialValues.known_dysfunctions,
                geo_naming_habit: initialValues.geo_naming_habit,
                geo_naming_suffix: initialValues.geo_naming_suffix,
                geo_naming_prohibition: initialValues.geo_naming_prohibition,
            });
        }
    }, [visible, initialValues, form]);

    // Clear form when modal is closed
    useEffect(() => {
        if (!visible) {
            form.resetFields();
            setBackupData({});
        }
    }, [visible, form]);

    const handleCancel = () => {
        setVisible(false);
    };

    const handleGenerateEmbedDocument = async () => {
        try {
            const { description, parent_id } = form.getFieldsValue(['description', 'parent_id']);
            setEmbedLoading(true);
            const embedText = await generateFactionEmbedText({
                description: description || undefined,
                hasParent: !!parent_id,
            });
            form.setFieldsValue({ embed_document: embedText });
            message.success('嵌入文档生成成功');
        } catch (e: any) {
            console.error('生成嵌入文档失败：', e);
            message.error(e?.message || '生成嵌入文档失败');
        } finally {
            setEmbedLoading(false);
        }
    };

    const handlesubmit = async () => {
        try {
            const formValues = await form.validateFields();
            console.debug('formValues --> ', formValues);
            let values = {
                ...backupData,
                ...formValues
            } as IFactionDefData;

            if (values.id) {
                await apiCalls.updateFaction(values);
                message.success('阵营更新成功');
            } else {
                await apiCalls.addFaction(values);
                message.success('阵营创建成功');
            }

            setVisible(false);
            loadFactionList();
            
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    let isCreate = !backupData?.id;

    return (
        <Modal
            title={isCreate ? "新建阵营" : "编辑阵营"}
            open={visible}
            onOk={handlesubmit}
            onCancel={handleCancel}
            width={'60vw'}
        >
            <Form
                form={form}
                // layout="vertical"
                labelCol={{ span: 3 }}
                wrapperCol={{ span: 20 }}
                initialValues={initialValues}
            >

                <Form.Item
                    name="worldview_id"
                    label="世界观"
                    rules={[{ required: true, message: '请选择世界观' }]}
                >
                    <Select options={worldViewList.map(item => ({ label: item.title, value: item.id }))} />
                </Form.Item>

                <Form.Item
                    name="parent_id"
                    label="上级阵营"
                >
                    <TreeSelect
                        treeData={factionTree}
                        fieldNames={{ label: 'name', value: 'id' }}
                        placeholder="请选择上级阵营"
                        allowClear
                    />
                </Form.Item>

                <Form.Item
                    name="name"
                    label="阵营名称"
                    rules={[{ required: true, message: '请输入阵营名称' }]}
                >
                    <Input placeholder="请输入阵营名称" />
                </Form.Item>

                <Form.Item
                    name="description"
                    label="阵营描述"
                >
                    <Input.TextArea
                        autoSize={{ minRows: 6 }}
                        placeholder="请输入阵营描述"
                    />
                </Form.Item>

                <Form.Item name="faction_type" label="阵营类型">
                    <Input placeholder="阵营类型" />
                </Form.Item>

                <Form.Item name="faction_culture" label="阵营文化">
                    <Input.TextArea rows={2} placeholder="阵营文化" />
                </Form.Item>

                <Form.Item name="ideology_or_meme" label="意识形态/梗文化">
                    <Input.TextArea rows={2} placeholder="输出或用于整活的文化" />
                </Form.Item>

                <Form.Item name="scale_of_operation" label="决策尺度">
                    <Select options={SCALE_OF_OPERATION_OPTIONS} placeholder="地区级、大陆级、行星级、多星级、文明级" allowClear />
                </Form.Item>

                <Form.Item name="decision_taboo" label="决策禁忌">
                    <Input.TextArea rows={2} placeholder="阵营绝不会做的事情" />
                </Form.Item>

                <Form.Item name="primary_threat_model" label="最大威胁来源">
                    <Input placeholder="最大威胁来源" />
                </Form.Item>

                <Form.Item name="internal_contradictions" label="内部矛盾">
                    <Input.TextArea rows={2} placeholder="阵营内部允许被公开展示的矛盾" />
                </Form.Item>

                <Form.Item name="legitimacy_source" label="正统来源">
                    <Input placeholder="阵营正统来源" />
                </Form.Item>

                <Form.Item name="known_dysfunctions" label="已知功能障碍">
                    <Input.TextArea rows={2} placeholder="阵营创伤后遗症" />
                </Form.Item>

                <Divider orientation="left" plain>地理·命名规范</Divider>

                <Form.Item name="geo_naming_habit" label="地理·命名习惯">
                    <Input.TextArea rows={2} placeholder="风格、偏好、通用要求（如：唐风、简短、OOC）" />
                </Form.Item>

                <Form.Item name="geo_naming_suffix" label="地理·命名后缀">
                    <Input.TextArea rows={2} placeholder="后缀及层级对应（如：道/州/郡/市/县）" />
                </Form.Item>

                <Form.Item name="geo_naming_prohibition" label="地理·命名禁忌">
                    <Input.TextArea rows={2} placeholder="严禁事项（如：禁界、禁京都、禁神话倾向）" />
                </Form.Item>

                <Form.Item label="嵌入文档">
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Button
                            icon={<EditOutlined />}
                            loading={embedLoading}
                            onClick={handleGenerateEmbedDocument}
                        >
                            生成嵌入文档
                        </Button>
                        <Form.Item name="embed_document" noStyle>
                            <Input.TextArea
                                rows={4}
                                placeholder="根据阵营描述生成或手动输入嵌入文档，用于向量检索"
                            />
                        </Form.Item>
                    </Space>
                </Form.Item>
            </Form>
        </Modal>
    );
});

FactionEdit.displayName = 'FactionEdit';

export default FactionEdit;
