import { Modal, Form, Input } from 'antd';
import { IFactionDefData } from '@/src/types/IAiNoval';
import { useEffect, forwardRef, useImperativeHandle, useState } from 'react';

interface IFactionEditProps {
    visible: boolean;
    onCancel: () => void;
    onOk: (values: IFactionDefData) => void;
    initialValues?: IFactionDefData;
}

export interface FactionEditRef {
    setFormValues: (values: IFactionDefData) => void;
    resetForm: () => void;
}

const FactionEdit = forwardRef<FactionEditRef, IFactionEditProps>(({
    visible,
    onCancel,
    onOk,
    initialValues
}, ref) => {
    const [form] = Form.useForm();
    const [backupData, setBackupData] = useState<Partial<IFactionDefData>>({});

    useImperativeHandle(ref, () => ({
        setFormValues: (values: IFactionDefData) => {
            // Backup the external data
            setBackupData(values);
            // Only set form values for fields that are in the form
            const formValues = {
                name: values.name,
                description: values.description
            };
            form.setFieldsValue(formValues);
        },
        resetForm: () => {
            form.resetFields();
            setBackupData({});
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

    const handleOk = async () => {
        try {
            const formValues = await form.validateFields();
            // Merge form values with backup data
            const mergedValues = {
                ...backupData,
                ...formValues
            } as IFactionDefData;
            onOk(mergedValues);
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    const handleCancel = () => {
        onCancel();
    };

    return (
        <Modal
            title={initialValues ? "编辑阵营" : "新建阵营"}
            open={visible}
            onOk={handleOk}
            onCancel={handleCancel}
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={initialValues}
            >
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
                        rows={4}
                        placeholder="请输入阵营描述"
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
});

FactionEdit.displayName = 'FactionEdit';

export default FactionEdit;
