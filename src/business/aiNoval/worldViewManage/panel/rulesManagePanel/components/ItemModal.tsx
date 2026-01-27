import { useEffect } from 'react';
import { Modal, Form, Input } from 'antd';
import { IWorldBookItem } from '../types';

const { TextArea } = Input;

interface ItemModalProps {
    open: boolean;
    editingItem: IWorldBookItem | null;
    groupId?: number;
    onOk: (values: any) => void;
    onCancel: () => void;
}

export default function ItemModal({
    open,
    editingItem,
    groupId,
    onOk,
    onCancel
}: ItemModalProps) {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open) {
            if (editingItem) {
                form.setFieldsValue({
                    summary: editingItem.summary,
                    content: editingItem.content,
                    group_id: editingItem.group_id
                });
            } else {
                form.setFieldsValue({
                    summary: '',
                    content: '',
                    group_id: groupId
                });
            }
        }
    }, [open, editingItem, groupId, form]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            onOk(values);
            form.resetFields();
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        onCancel();
    };

    return (
        <Modal
            title={editingItem ? '编辑条目' : '添加条目'}
            open={open}
            onOk={handleOk}
            onCancel={handleCancel}
            width={600}
            okText="保存"
            cancelText="取消"
        >
            <Form
                form={form}
                layout="vertical"
            >
                <Form.Item
                    name="summary"
                    label="摘要"
                    rules={[{ required: true, message: '请输入摘要' }]}
                >
                    <Input placeholder="请输入摘要" />
                </Form.Item>

                <Form.Item
                    name="content"
                    label="内容"
                >
                    <TextArea 
                        rows={8} 
                        placeholder="请输入内容..."
                        showCount
                        maxLength={5000}
                    />
                </Form.Item>

                {!editingItem && (
                    <Form.Item
                        name="group_id"
                        label="所属分组"
                        rules={[{ required: true, message: '请选择分组' }]}
                    >
                        <Input disabled />
                    </Form.Item>
                )}
            </Form>
        </Modal>
    );
}
