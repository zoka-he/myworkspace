import { useEffect, useState } from 'react';
import { Card, Table, Button, Space, message, Modal, Form, Input, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, HistoryOutlined, FileTextOutlined } from '@ant-design/icons';
import { useMagicSystemManage } from '../context';
import fetch from '@/src/fetch';
import { IMagicSystemVersion } from '@/src/types/IAiNoval';
import type { ColumnsType } from 'antd/es/table';

export default function VersionManage() {
    const { state, dispatch } = useMagicSystemManage();
    const [modalVisible, setModalVisible] = useState(false);
    const [editingVersion, setEditingVersion] = useState<IMagicSystemVersion | null>(null);
    const [viewingVersion, setViewingVersion] = useState<IMagicSystemVersion | null>(null);
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // 加载版本列表
    useEffect(() => {
        if (state.selectedMagicSystemId) {
            loadVersions();
        } else {
            dispatch({ type: 'SET_MAGIC_SYSTEM_VERSIONS', payload: [] });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.selectedMagicSystemId]);

    async function loadVersions() {
        if (!state.selectedMagicSystemId) return;

        try {
            setLoading(true);
            const response = await fetch.get('/api/aiNoval/magic_system/version', {
                params: { def_id: state.selectedMagicSystemId }
            });
            const versions = response.data || [];
            dispatch({ 
                type: 'SET_MAGIC_SYSTEM_VERSIONS', 
                payload: versions,
                systemId: state.selectedMagicSystemId
            });
        } catch (e: any) {
            console.error(e);
            message.error('加载版本列表失败: ' + e.message);
        } finally {
            setLoading(false);
        }
    }

    function handleAdd() {
        setEditingVersion(null);
        form.resetFields();
        form.setFieldsValue({
            version_name: '',
            content: '',
        });
        setModalVisible(true);
    }

    function handleEdit(version: IMagicSystemVersion) {
        setEditingVersion(version);
        form.setFieldsValue({
            version_name: version.version_name,
            content: version.content,
        });
        setModalVisible(true);
    }

    function handleView(version: IMagicSystemVersion) {
        setViewingVersion(version);
    }

    async function handleSave() {
        try {
            const values = await form.validateFields();
            
            // 检查必要的ID
            if (!state.selectedMagicSystemId) {
                message.error('请先选择一个技能系统');
                return;
            }

            // 获取 worldview_id：优先使用 selectedWorldviewId，如果为空则从选中的系统对象中获取
            let worldviewId = state.selectedWorldviewId;
            if (!worldviewId) {
                const selectedSystem = state.magicSystemList.find(
                    sys => sys.id === state.selectedMagicSystemId
                );
                worldviewId = selectedSystem?.worldview_id || null;
            }

            if (!worldviewId) {
                message.error('无法获取世界观ID，请确保已选择世界观');
                return;
            }

            setLoading(true);

            const payload = {
                def_id: state.selectedMagicSystemId,
                worldview_id: worldviewId,
                version_name: values.version_name,
                content: values.content,
            };

            if (editingVersion?.id) {
                // 更新
                await fetch.post('/api/aiNoval/magic_system/version', payload, {
                    params: { id: editingVersion.id }
                });
                message.success('更新成功');
                dispatch({
                    type: 'UPDATE_VERSION',
                    payload: { ...editingVersion, ...payload }
                });
            } else {
                // 创建
                const response = await fetch.post('/api/aiNoval/magic_system/version', payload);
                message.success('创建成功');
                // 重新加载列表
                await loadVersions();
            }

            setModalVisible(false);
            form.resetFields();
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

    async function handleDelete(versionId: number) {
        try {
            setLoading(true);
            await fetch.delete('/api/aiNoval/magic_system/version', {
                params: { id: versionId }
            });
            message.success('删除成功');
            dispatch({ type: 'DELETE_VERSION', payload: versionId });
        } catch (e: any) {
            console.error(e);
            message.error('删除失败: ' + e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSetCurrentVersion(versionId: number) {
        if (!state.selectedMagicSystemId) return;

        try {
            setLoading(true);
            await fetch.post('/api/aiNoval/magic_system/def', {
                version_id: versionId
            }, {
                params: { id: state.selectedMagicSystemId }
            });
            message.success('已设置为当前版本');
            
            // 获取 worldview_id：优先使用 selectedWorldviewId，如果为空则从选中的系统对象中获取
            let worldviewId = state.selectedWorldviewId;
            if (!worldviewId) {
                const selectedSystem = state.magicSystemList.find(
                    sys => sys.id === state.selectedMagicSystemId
                );
                worldviewId = selectedSystem?.worldview_id || null;
            }

            // 重新加载技能系统列表（如果 worldviewId 存在）
            if (worldviewId) {
                const response = await fetch.get('/api/aiNoval/magic_system/def', {
                    params: { worldview_id: worldviewId }
                });
                dispatch({ type: 'SET_MAGIC_SYSTEM_LIST', payload: response.data || [] });
            } else {
                // 如果无法获取 worldviewId，至少更新当前系统的 version_id
                const selectedSystem = state.magicSystemList.find(
                    sys => sys.id === state.selectedMagicSystemId
                );
                if (selectedSystem) {
                    dispatch({
                        type: 'UPDATE_MAGIC_SYSTEM',
                        payload: { ...selectedSystem, version_id: versionId }
                    });
                }
            }

            // 重新加载版本列表，确保 UI 状态同步
            await loadVersions();
        } catch (e: any) {
            console.error(e);
            message.error('设置失败: ' + e.message);
        } finally {
            setLoading(false);
        }
    }

    const columns: ColumnsType<IMagicSystemVersion> = [
        {
            title: '版本名称',
            dataIndex: 'version_name',
            key: 'version_name',
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 180,
            render: (date: Date) => date ? new Date(date).toLocaleString() : '-',
        },
        {
            title: '更新时间',
            dataIndex: 'updated_at',
            key: 'updated_at',
            width: 180,
            render: (date: Date) => date ? new Date(date).toLocaleString() : '-',
        },
        {
            title: '版本管理',
            key: 'versionManage',
            width: 120,
            render: (_, record) => {
                const isCurrentVersion = state.magicSystemList.find(
                    sys => sys.id === state.selectedMagicSystemId
                )?.version_id === record.id;

                return (
                    <>
                        {!isCurrentVersion && (
                            <Button
                                size="small"
                                type="link"
                                onClick={() => handleSetCurrentVersion(record.id)}
                            >
                                设为当前
                            </Button>
                        )}
                        {isCurrentVersion && (
                            <span style={{ color: '#52c41a' }}>当前版本</span>
                        )}
                    </>
                );
            },
        },
        {
            title: '操作',
            key: 'action',
            width: 200,
            render: (_, record) => {
                return (
                    <Space>
                        <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleView(record)}
                        >
                            查看
                        </Button>
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                        >
                            编辑
                        </Button>
                        <Popconfirm
                            title="确定要删除这个版本吗？"
                            onConfirm={() => handleDelete(record.id)}
                            okText="确定"
                            cancelText="取消"
                        >
                            <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                            >
                                删除
                            </Button>
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ];

    // 获取当前版本（从 CurrentVersionPreview 的逻辑）
    function getCurrentVersion(): IMagicSystemVersion | null {
        if (!state.selectedMagicSystemId) return null;

        const currentSystem = state.magicSystemList.find(
            sys => sys.id === state.selectedMagicSystemId
        );

        if (!currentSystem?.version_id) return null;

        return state.magicSystemVersions.find(
            version => version.id === currentSystem.version_id
        ) || null;
    }

    const currentVersion = getCurrentVersion();

    if (!state.selectedMagicSystemId) {
        const selectedWorldview = state.selectedWorldviewId 
            ? state.worldviewList.find(w => w.id === state.selectedWorldviewId)
            : null;
        
        return (
            <Card
                title={
                    <Space>
                        <HistoryOutlined />
                        <span>版本管理</span>
                    </Space>
                }
                style={{ minHeight: 650 }}
            >
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                    {selectedWorldview ? '请从左侧选择一个技能系统' : '请先选择一个世界观或技能系统'}
                </div>
            </Card>
        );
    }

    return (
        <>
            <Card
                title={
                    <Space>
                        <HistoryOutlined />
                        <span>版本管理</span>
                    </Space>
                }
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAdd}
                    >
                        创建新版本
                    </Button>
                }
            >
                <Table
                    columns={columns}
                    dataSource={state.magicSystemVersions}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    size="small"
                />
                
                {/* 当前版本预览 */}
                <div style={{ marginTop: 24, paddingTop: 16 }}>
                    <div style={{ marginBottom: 12 }}>
                        <FileTextOutlined style={{ marginRight: 8 }} />
                        <strong>当前版本：{currentVersion ? currentVersion.version_name : '暂无当前版本'}</strong>
                    </div>
                    {currentVersion ? (
                        <pre style={{
                            background: '#f5f5f5',
                            padding: 16,
                            borderRadius: 4,
                            margin: 0,
                            minHeight: 200,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            fontSize: '12px',
                            lineHeight: '1.5'
                        }}>
                            {(() => {
                                try {
                                    return JSON.stringify(JSON.parse(currentVersion.content), null, 2);
                                } catch {
                                    return currentVersion.content;
                                }
                            })()}
                        </pre>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                            暂无当前版本
                        </div>
                    )}
                </div>
            </Card>

            <Modal
                title={editingVersion ? '编辑版本' : '创建新版本'}
                open={modalVisible}
                onOk={handleSave}
                onCancel={() => {
                    setModalVisible(false);
                    form.resetFields();
                }}
                width={800}
                confirmLoading={loading}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="version_name"
                        label="版本名称"
                        rules={[{ required: true, message: '请输入版本名称' }]}
                    >
                        <Input placeholder="例如：v1.0.0" />
                    </Form.Item>
                    <Form.Item
                        name="content"
                        label="系统内容"
                        rules={[
                            { required: true, message: '请输入系统内容' },
                            
                        ]}
                    >
                        <Input.TextArea
                            autoSize={{ minRows: 15 }}
                            placeholder='完整系统设定'
                            style={{ fontFamily: 'monospace' }}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="查看版本内容"
                open={!!viewingVersion}
                onCancel={() => setViewingVersion(null)}
                footer={null}
                width={800}
            >
                {viewingVersion && (
                    <div>
                        <p><strong>版本名称：</strong>{viewingVersion.version_name}</p>
                        <p><strong>创建时间：</strong>
                            {viewingVersion.created_at ? new Date(viewingVersion.created_at).toLocaleString() : '-'}
                        </p>
                        <p><strong>更新时间：</strong>
                            {viewingVersion.updated_at ? new Date(viewingVersion.updated_at).toLocaleString() : '-'}
                        </p>
                        <div style={{ marginTop: 16 }}>
                            <strong>系统内容：</strong>
                            <pre style={{
                                background: '#f5f5f5',
                                padding: 16,
                                borderRadius: 4,
                                maxHeight: 400,
                                overflow: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all'
                            }}>
                                {(() => {
                                    try {
                                        return JSON.stringify(JSON.parse(viewingVersion.content), null, 2);
                                    } catch {
                                        return viewingVersion.content;
                                    }
                                })()}
                            </pre>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}
