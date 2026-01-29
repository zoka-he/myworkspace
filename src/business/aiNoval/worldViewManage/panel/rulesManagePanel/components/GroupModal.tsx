import { useEffect } from 'react';
import { Modal, Form, Input } from 'antd';
import { IWorldBookGroup } from '../types';

interface GroupModalProps {
    open: boolean;
    editingGroup: IWorldBookGroup | null;
    onOk: (values: { title: string }) => void;
    onCancel: () => void;
}

export default function GroupModal({
    open,
    editingGroup,
    onOk,
    onCancel
}: GroupModalProps) {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open) {
            if (editingGroup) {
                form.setFieldsValue({
                    title: editingGroup.title
                });
            } else {
                form.setFieldsValue({
                    title: ''
                });
            }
        }
    }, [open, editingGroup, form]);

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
            title={editingGroup ? '编辑分组' : '添加分组'}
            open={open}
            onOk={handleOk}
            onCancel={handleCancel}
            width={500}
            okText="保存"
            cancelText="取消"
        >
            <Form
                form={form}
                layout="vertical"
            >
                <Form.Item
                    name="title"
                    label="分组名称"
                    rules={[{ required: true, message: '请输入分组名称' }]}
                >
                    <Input placeholder="请输入分组名称" />
                </Form.Item>
            </Form>
        </Modal>
    );
}
