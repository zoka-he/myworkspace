import { Row, Col, Card, Space, Button, Select, List, Modal, message, Alert, Table, Typography } from "antd";
import { useEffect, useState, useRef } from "react";
import { getWorldViews } from "../common/worldViewUtil";
import { IRoleData, IWorldViewData, IRoleInfo } from "@/src/types/IAiNoval";
import apiCalls from "./apiCalls";
import { RoleDefModal, useRoleDefModal } from "./edit/roleDefModal";
import { DeleteOutlined, ExclamationCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { RoleInfoPanel } from "./panel/roleInfoPanel";
import { RoleInfoEditModal, RoleInfoEditModalRef } from './edit/roleInfoEditModal';

const { Title } = Typography;

interface RoleVersion {
    id: string;
    version: string;
}

export default function RoleManage() {
    const [worldViewList, setWorldViewList] = useState<IWorldViewData[]>([]);
    const [worldViewId, setWorldViewId] = useState<number | null>(null);

    const [roleList, setRoleList] = useState<IRoleData[]>([]);
    const [selectedRole, setSelectedRole] = useState<IRoleData | undefined>(undefined);
    const [selectedVersion, setSelectedVersion] = useState<string | undefined>();
    const [roleVersions, setRoleVersions] = useState<{ label: string; value: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const roleInfoEditModalRef = useRef<RoleInfoEditModalRef>(null);

    const { isOpen, presetValues, openModal, closeModal } = useRoleDefModal();

    async function reloadAll() {
        let res = await getWorldViews()
        setWorldViewList(res.data);
    }

    useEffect(() => {
        apiCalls.getRoleList(worldViewId).then((res) => {
            setRoleList(res.data);
            setSelectedRole(undefined);
        });
    }, [worldViewId]);

    useEffect(() => {
        reloadAll();
    }, []);

    // 当选中角色变化时，加载该角色的版本列表
    useEffect(() => {
        if (selectedRole?.id) {
            // TODO: 替换为实际的API调用
            // 临时使用模拟数据
            const mockVersions: RoleVersion[] = [
                { id: '1', version: '1.0' },
                { id: '2', version: '2.0' }
            ];
            setRoleVersions(mockVersions.map(version => ({
                label: `v${version.version}`,
                value: version.id
            })));
        } else {
            setRoleVersions([]);
        }
    }, [selectedRole]);

    const handleCreateRole = async (values: { name?: string }) => {
        console.debug('createRole', values);

        await apiCalls.createRole({
            ...values,
        });
        // 重新加载角色列表
        const res = await apiCalls.getRoleList(worldViewId);
        setRoleList(res.data);
    };

    const handleDeleteRole = async (role: IRoleData) => {
        if (!role.id) {
            message.error('缺少role_id，请检查数据');
            return;
        }

        try {
            await apiCalls.deleteRole(role.id);
            message.success('删除成功');
            // 重新加载角色列表
            if (worldViewId) {
                const res = await apiCalls.getRoleList(worldViewId);
                setRoleList(res.data);
            }
        } catch (error) {
            message.error('删除失败');
        }
    };

    const showDeleteConfirm = (role: IRoleData) => {
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除角色"${role.name}"吗？`,
            okText: '确认',
            okType: 'danger',
            cancelText: '取消',
            onOk: () => handleDeleteRole(role)
        });
    };

    const roleListTitle = (
        <Space>
            <label>世界观：</label>
            <Select 
                style={{ width: 170 }} 
                allowClear value={worldViewId} 
                onChange={(value) => setWorldViewId(value)}
                onClear={() => setWorldViewId(null)}
            >
                {worldViewList.map((item) => (
                    <Select.Option key={item.id} value={item.id}>{item.title}</Select.Option>
                ))}
            </Select>
            <Button type="primary" onClick={reloadAll}>刷新</Button>
        </Space>
    );

    function renderRoleItem(item: IRoleData) {
        if (item.version) {
            return (
                <List.Item.Meta title={`${item.name} (v${item.version})`}/>
            )
        } else {
            return (
                <List.Item.Meta title={<Space><ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /><span>{item.name}</span><span style={{ fontSize: 12, color: '#999' }}>未创建属性版本</span></Space>}/>
            )
        }
    }

    const handleVersionChange = async (versionId: string) => {
        setSelectedVersion(versionId);
    };

    const handleVersionManage = () => {
        if (selectedRole) {
            roleInfoEditModalRef.current?.openAndEdit({
                version_name: "新版本",
                worldview_id: worldViewId || 0,
                name_in_worldview: selectedRole.name,
                role_id: selectedRole.id
            });
            setEditModalVisible(true);
        }
    };

    const handleCreateRoleInfo = async (data: IRoleInfo) => {
        try {
            const response = await apiCalls.createRoleInfo(data);

            if (!response.ok) {
                throw new Error('Failed to create role info');
            }

            message.success('创建角色版本成功');
            setEditModalVisible(false);
            // 刷新版本列表
            if (selectedRole?.id) {
                const versionsResponse = await fetch(`/api/roles/${selectedRole.id}/versions`);
                const versionsData = await versionsResponse.json();
                setRoleVersions(versionsData.map((version: any) => ({
                    label: version.version_name,
                    value: version.id
                })));
            }
        } catch (error) {
            console.error('Failed to create role info:', error);
            message.error('创建角色版本失败');
        }
    };

    const handleOpenRoleInfoEditModal = (roleDef: IRoleData) => {
        if (roleDef) {
            roleInfoEditModalRef.current?.openAndEdit({
                version_name: "新版本",
                worldview_id: worldViewId || 0,
                name_in_worldview: roleDef.name,
                role_id: roleDef.id
            });
            setEditModalVisible(true);
        }
    };

    return (
        <div className="f-fit-height" style={{ paddingBottom: 10 }}>
            <Row className="f-fit-height" gutter={10}>
                <Col className="f-fit-height" span={6}>
                    <Card className="f-fit-height" title={roleListTitle}>
                        <div className="f-flex-col">
                            <Alert style={{ marginBottom: 10 }} message="添加角色后，角色不会立即出现在世界观，需要添加关联世界观的角色属性版本，相关角色会显示感叹号" type="info" />
                            <Button 
                                className="f-fit-width" 
                                onClick={() => openModal()}
                            >
                                添加角色
                            </Button>
                            <List className="f-flex-1" size="small">
                                {roleList.map((item) => (
                                    <List.Item 
                                        key={item.id} 
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setSelectedRole(item)}
                                        actions={[
                                            <Button
                                                type="text"
                                                danger
                                                disabled={!!item.version_count && item.version_count > 0}
                                                icon={<DeleteOutlined />}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    showDeleteConfirm(item);
                                                }}
                                            />
                                        ]}
                                    >
                                        {renderRoleItem(item)}
                                    </List.Item>
                                ))}
                            </List>
                        </div>
                    </Card>
                </Col>
                <Col className="f-fit-height" span={11}>
                    <Card className="f-fit-height" title="角色关系">
                        
                    </Card>
                </Col>
                <Col className="f-fit-height" span={7}>
                    <Card className="f-fit-height" title="角色属性及版本">
                        {selectedRole ? (
                            <RoleInfoPanel
                                roleDef={selectedRole}
                                active_version_id={selectedVersion}
                                versions={roleVersions}
                                onVersionChange={handleVersionChange}
                                onVersionManage={handleVersionManage}
                                onOpenRoleInfoEditModal={handleOpenRoleInfoEditModal}
                            />
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                请选择一个角色查看详情
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>

            <RoleDefModal
                open={isOpen}
                onCancel={closeModal}
                onOk={values => handleCreateRole(values)}
                initialValues={presetValues}
                title="创建角色"
            />

            <RoleInfoEditModal
                ref={roleInfoEditModalRef}
                open={editModalVisible}
                onCancel={() => setEditModalVisible(false)}
                onSubmit={handleCreateRoleInfo}
                worldViewList={worldViewList}
                roleData={selectedRole}
            />
        </div>
    )
}
