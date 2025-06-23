import { Row, Col, Card, Space, Button, Select, List, Modal, message, Alert, Table, Typography, Radio } from "antd";
import { useEffect, useState, useRef, useMemo } from "react";
import { getWorldViews } from "../common/worldViewUtil";
import { IRoleData, IWorldViewData, IRoleInfo } from "@/src/types/IAiNoval";
import apiCalls from "./apiCalls";
import { RoleDefModal, useRoleDefModal } from "./edit/roleDefModal";
import { DeleteOutlined, ExclamationCircleOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { RoleInfoPanel } from "./panel/roleInfoPanel";
import { RoleInfoEditModal, RoleInfoEditModalRef } from './edit/roleInfoEditModal';
import { RoleRelationPanel } from "./panel/roleRelationPanel";
import { D3RoleRelationGraph } from "./panel/d3RoleRelationGraph";

export default function RoleManage() {
    const [worldViewList, setWorldViewList] = useState<IWorldViewData[]>([]);
    const [worldViewId, setWorldViewId] = useState<number | null>(null);

    const [roleList, setRoleList] = useState<IRoleData[]>([]);
    const [selectedRole, setSelectedRole] = useState<IRoleData | undefined>(undefined);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [updateTimestamp, setUpdateTimestamp] = useState(0);
    const [figUpdateTimestamp, setFigUpdateTimestamp] = useState(0);

    const roleInfoEditModalRef = useRef<RoleInfoEditModalRef>(null);

    const { isOpen, presetValues, openModal, closeModal } = useRoleDefModal();

    const [activePanel, setActivePanel] = useState('attributes');

    // 创建世界观映射表
    const worldviewMap = useMemo(() => {
        return new Map(worldViewList.map(w => [w.id!, w]));
    }, [worldViewList]);

    async function loadRoleDefList() {
        let selectedRoleId = selectedRole?.id;

        let res = await apiCalls.getRoleList(worldViewId)
        setRoleList(res.data);

        if (selectedRoleId) {
            setSelectedRole(res.data.find((role: IRoleData) => role.id === selectedRoleId));
        }

        return res.data;
    }

    async function reloadAll() {
        let res = await getWorldViews()
        setWorldViewList(res.data);

        loadRoleDefList();
    }

    useEffect(() => {
        loadRoleDefList();
    }, [worldViewId]);

    useEffect(() => {
        reloadAll();
    }, []);

    // 创建角色
    const handleCreateRole = async (values: { name?: string }) => {
        console.debug('createRole', values);

        await apiCalls.createRole({
            ...values,
        });
        // 重新加载角色列表
        const res = await apiCalls.getRoleList(worldViewId);
        setRoleList(res.data);
    };

    // 删除角色
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

    /**
     * 渲染角色列表标题
     * @returns 
     */
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

    /**
     * 渲染角色列表
     * @param item 
     * @returns 
     */
    function renderRoleItem(item: IRoleData) {
        let itemText = null;

        if (item.version_name) {
            itemText = <List.Item.Meta title={`${item.name} (${item.version_name})`}/>;
        } else {
            itemText = <List.Item.Meta title={<Space><ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /><span>{item.name}</span><span style={{ fontSize: 12, color: '#999' }}>未关联属性版本</span></Space>}/>;
        }

        return (
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
                {itemText}
            </List.Item>
        );
    }

    const handleNodeClick = (roleId: string | number) => {
        let role = roleList.find(item => item.id == Number(roleId));
        if (role) {
            setSelectedRole(role);
        }
    }

    // 更改角色属性的版本
    const handleVersionChange = async (roleDef: IRoleData) => {
        try {
            await apiCalls.updateRole(roleDef);
            message.success('更新角色版本成功');


            // 刷新角色列表
            await loadRoleDefList() as IRoleData[];
            console.debug('handleVersionChange updateTimestamp --->> ', Date.now());
            setUpdateTimestamp(Date.now());
        } catch (error) {
            console.error('Failed to update role:', error);
            message.error('更新角色版本失败');
        }
    };

    // 创建或更新角色属性
    const handleCreateOrUpdateRoleInfo = async (roleDef: IRoleData, data: IRoleInfo) => {
        try {
            let response = null;

            delete data.created_at;
            
            if (data.id) {
                response = await apiCalls.updateRoleInfo(data);
            } else {
                response = await apiCalls.createRoleInfo(data);
            }

            message.success(data.id ? '更新角色版本成功' : '创建角色版本成功');
            setEditModalVisible(false);

            // 刷新角色列表
            await loadRoleDefList() as IRoleData[];
            console.debug('handleCreateOrUpdateRoleInfo updateTimestamp --->> ', Date.now());
            setUpdateTimestamp(Date.now());

        } catch (error) {
            console.error('Failed to create role info:', error);
            message.error('创建角色版本失败');
        }
    };

    const handleDeleteRoleInfo = async (roleDef: IRoleData, data: IRoleInfo) => {
        try {
            await apiCalls.deleteRoleInfo(data);
            await apiCalls.updateRole({ id: roleDef.id, version: null });
            message.success('删除成功');

            // 刷新角色列表
            await loadRoleDefList() as IRoleData[];
            console.debug('handleDeleteRoleInfo updateTimestamp --->> ', Date.now());
            setUpdateTimestamp(Date.now());
        } catch (error) {
            message.error('删除失败');
        }
    }

    // 打开角色属性编辑模态框
    const handleOpenRoleInfoEditModal = (roleDef: IRoleData, data?: IRoleInfo) => {
        if (roleDef) {
            roleInfoEditModalRef.current?.openAndEdit(roleDef, data);
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
                                {roleList.map(renderRoleItem)}
                            </List>
                        </div>
                    </Card>
                </Col>
                <Col className="f-fit-height" span={11}>
                    <Card className="f-fit-height" title={
                        <Space>
                            <span>角色关系图</span>
                            <Button type="primary" size="small" icon={<ReloadOutlined />} onClick={() => {
                                console.debug('handleRelationUpdate updateTimestamp --->> ', Date.now());
                                setUpdateTimestamp(Date.now())
                            }}>刷新</Button>
                        </Space>
                    }>
                        <D3RoleRelationGraph 
                            worldview_id={worldViewId?.toString() || ''} 
                            updateTimestamp={updateTimestamp}
                            onNodeClick={handleNodeClick}
                        />
                    </Card>
                </Col>
                <Col className="f-fit-height" span={7}>
                    <Card 
                      className="f-fit-height" 
                      title={
                        <Radio.Group 
                          value={activePanel} 
                          onChange={e => setActivePanel(e.target.value)}
                          buttonStyle="solid"
                          optionType="button"
                        >
                          <Radio.Button value="attributes">角色属性及版本</Radio.Button>
                          <Radio.Button value="relations">角色关系</Radio.Button>
                        </Radio.Group>
                      }
                    >
                      {activePanel === 'attributes' ? (
                        selectedRole ? (
                            <RoleInfoPanel
                                roleDef={selectedRole}
                                updateTimestamp={updateTimestamp}
                                onVersionChange={handleVersionChange}
                                onOpenRoleInfoEditModal={handleOpenRoleInfoEditModal}
                                onDeleteRoleInfo={handleDeleteRoleInfo}
                                worldviewMap={worldviewMap}
                            />
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                请选择一个角色查看详情
                            </div>
                        )
                      ) : (
                        selectedRole ? (
                          <RoleRelationPanel 
                            roleId={selectedRole.id} 
                            roleName={selectedRole.name!}
                            candidateRoles={roleList}
                            worldViews={worldViewList}
                            worldViewId={worldViewId}
                            onUpdate={() => {
                                console.debug('handleRelationUpdate updateTimestamp --->> ', Date.now());
                                setUpdateTimestamp(Date.now())
                            }}
                          />
                        ) : (
                          <div className="f-center">
                            请选择一个角色查看关系
                          </div>
                        )
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
                onSubmit={handleCreateOrUpdateRoleInfo}
                worldViewList={worldViewList}
                roleData={selectedRole}
            />
        </div>
    )
}
