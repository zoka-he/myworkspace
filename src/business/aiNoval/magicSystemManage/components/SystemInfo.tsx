import { useEffect, useMemo, useState } from 'react';
import { Card, Descriptions, Button, Space, message, Modal, Form, Input, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useMagicSystemManage, useWorldviewList } from '../context';
import fetch from '@/src/fetch';
import { IMagicSystemDef } from '@/src/types/IAiNoval';

export default function SystemInfo() {
    const { state, dispatch } = useMagicSystemManage();
    const [editing, setEditing] = useState(false);
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const selectedSystem = state.magicSystemList.find(sys => sys.id === state.selectedMagicSystemId);
    const [worldviewList, setWorldviewList] = useWorldviewList();

    const worldviewOfSelectedSystem = useMemo<IWorldViewData | null>(
        () => worldviewList.find(worldview => worldview.id === selectedSystem?.worldview_id), 
        [worldviewList, selectedSystem]
    );

    useEffect(() => {
        if (selectedSystem) {
            form.setFieldsValue({
                system_name: selectedSystem.system_name,
            });
        }
    }, [selectedSystem, form]);

    async function handleSave() {
        try {
            const values = await form.validateFields();
            setLoading(true);
            
            if (state.selectedMagicSystemId) {
                await fetch.post('/api/aiNoval/magic_system/def', values, {
                    params: { id: state.selectedMagicSystemId }
                });
                message.success('更新成功');
                dispatch({
                    type: 'UPDATE_MAGIC_SYSTEM',
                    payload: { ...selectedSystem, ...values }
                });
            }
            
            setEditing(false);
        } catch (e: any) {
            console.error(e);
            if (e.errorFields) {
                return; // 表单验证错误
            }
            message.error('保存失败: ' + e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (!state.selectedMagicSystemId) return;

        try {
            setLoading(true);
            await fetch.delete('/api/aiNoval/magic_system/def', {
                params: { id: state.selectedMagicSystemId }
            });
            message.success('删除成功');
            dispatch({ type: 'DELETE_MAGIC_SYSTEM', payload: state.selectedMagicSystemId });
            dispatch({ type: 'SET_SELECTED_MAGIC_SYSTEM_ID', payload: null });
        } catch (e: any) {
            console.error(e);
            message.error('删除失败: ' + e.message);
        } finally {
            setLoading(false);
        }
    }

    if (!selectedSystem) {
        return (
            <Card>
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                    请从左侧选择一个技能系统
                </div>
            </Card>
        );
    }

    return (
        <Card
            title={
                <Space>
                    <AppstoreOutlined />
                    <span>技能系统信息</span>
                </Space>
            }
            extra={
                <Space>
                    {!editing ? (
                        <>
                            <Button
                                type="primary"
                                icon={<EditOutlined />}
                                onClick={() => setEditing(true)}
                            >
                                编辑
                            </Button>
                            <Popconfirm
                                title="确定要删除这个技能系统吗？"
                                onConfirm={handleDelete}
                                okText="确定"
                                cancelText="取消"
                            >
                                <Button
                                    type="primary"
                                    danger
                                    icon={<DeleteOutlined />}
                                    loading={loading}
                                ></Button>
                            </Popconfirm>
                        </>
                    ) : (
                        <>
                            <Button onClick={() => setEditing(false)}>取消</Button>
                            <Button type="primary" onClick={handleSave} loading={loading}>
                                保存
                            </Button>
                        </>
                    )}
                </Space>
            }
        >
            {editing ? (
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="system_name"
                        label="系统名称"
                        rules={[{ required: true, message: '请输入系统名称' }]}
                    >
                        <Input placeholder="请输入系统名称" />
                    </Form.Item>
                </Form>
            ) : (
                <Descriptions size="small" column={2} bordered>
                    <Descriptions.Item label="系统ID">{selectedSystem.id}</Descriptions.Item>
                    <Descriptions.Item label="系统名称">{selectedSystem.system_name}</Descriptions.Item>
                    <Descriptions.Item label="世界观">{worldviewOfSelectedSystem?.title}</Descriptions.Item>
                    <Descriptions.Item label="当前版本">{state.magicSystemVersions.find(version => version.id === selectedSystem.version_id)?.version_name || '无'}</Descriptions.Item>
                    <Descriptions.Item label="创建时间">
                        {selectedSystem.created_at ? new Date(selectedSystem.created_at).toLocaleString() : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="更新时间">
                        {selectedSystem.updated_at ? new Date(selectedSystem.updated_at).toLocaleString() : '-'}
                    </Descriptions.Item>
                </Descriptions>
            )}
        </Card>
    );
}
