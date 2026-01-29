import { useState } from 'react';
import { Modal, Form, Input, message, Alert } from 'antd';
import { useMagicSystemManage } from '../context';
import fetch from '@/src/fetch';

interface AddSystemModalProps {
    visible: boolean;
    onCancel: () => void;
    onSuccess: () => void;
}

export default function AddSystemModal({ visible, onCancel, onSuccess }: AddSystemModalProps) {
    const { state } = useMagicSystemManage();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // 获取当前世界观信息
    const currentWorldview = state.worldviewList.find(
        w => w.id === state.selectedWorldviewId
    );

    async function handleSubmit() {
        try {
            const values = await form.validateFields();
            setLoading(true);

            // 获取当前世界观下的技能系统列表，计算新的 order_num
            const existingSystems = state.magicSystemList.filter(
                sys => sys.worldview_id === state.selectedWorldviewId
            );
            const maxOrderNum = existingSystems.length > 0 
                ? Math.max(...existingSystems.map((sys: any) => sys.order_num || 0))
                : 0;
            const newOrderNum = maxOrderNum + 1;

            await fetch.post('/api/aiNoval/magic_system/def', {
                worldview_id: state.selectedWorldviewId,
                system_name: values.system_name,
                order_num: newOrderNum,
                version_id: null,
            });

            message.success('创建成功');
            form.resetFields();
            onSuccess();
            onCancel();
        } catch (e: any) {
            console.error(e);
            if (e.errorFields) {
                return; // 表单验证错误
            }
            message.error('创建失败: ' + e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal
            title="添加技能系统"
            open={visible}
            onOk={handleSubmit}
            onCancel={onCancel}
            confirmLoading={loading}
        >
            {currentWorldview && (
                <Alert
                    message={`当前所属世界观：${currentWorldview.title || '未命名世界观'}`}
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}
            <Form form={form} layout="vertical">
                <Form.Item
                    name="system_name"
                    label="系统名称"
                    rules={[{ required: true, message: '请输入系统名称' }]}
                >
                    <Input placeholder="请输入技能系统名称" />
                </Form.Item>
            </Form>
        </Modal>
    );
}
