import { Modal, Form, Input, TreeSelect, Select, message, Space, Button } from 'antd';
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
                embed_document: values.embed_document
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
                embed_document: values.embed_document
            };
            form.setFieldsValue(formValues);
        }
    }));

    useEffect(() => {
        if (visible && initialValues) {
            setBackupData(initialValues);
            form.setFieldsValue({
                name: initialValues.name,
                description: initialValues.description
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
