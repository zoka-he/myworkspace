import { Row, Col, Card, Space, Button, Select, List, Modal, message, Alert, Table, Typography, Radio, Tree, TreeProps, TreeDataNode, Tag } from "antd";
import { useEffect, useState, useRef, useMemo, ReactNode } from "react";
import { getWorldViews } from "../common/worldViewUtil";
import { IRoleData, IWorldViewData, IRoleInfo } from "@/src/types/IAiNoval";
import apiCalls from "./apiCalls";
import { RoleDefModal, useRoleDefModal } from "./edit/roleDefModal";
import { DeleteOutlined, EditOutlined, ExclamationCircleOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { RoleInfoPanel } from "./panel/roleInfoPanel";
import { RoleInfoEditModal, RoleInfoEditModalRef } from './edit/roleInfoEditModal';
import { RoleRelationPanel } from "./panel/roleRelationPanel";
import { D3RoleRelationGraph } from "./panel/d3RoleRelationGraph";
import RoleManageContextProvider, { useFactionList, useLoadFactionList, useLoadRoleDefList, useLoadRoleInfoList, useLoadWorldViewList, useRoleDefList, useRoleId, useRoleInfoList, useWorldViewId, useWorldViewList, useRoleInfoId, useRoleChromaMetadataList, calculateRoleInfoFingerprint, IRoleChromaMetadata } from "./roleManageContext";
import { IFactionDefData } from "@/src/types/IAiNoval";
import _ from 'lodash';

export default function RoleManage() {

    const [worldViewList, setWorldViewList] = useState<IWorldViewData[]>([]);
    const [worldViewId, setWorldViewId] = useState<number | null>(null);

    const [roleList, setRoleList] = useState<IRoleData[]>([]);
    const [selectedRole, setSelectedRole] = useState<IRoleData | undefined>(undefined);
    const [editModalVisible, setEditModalVisible] = useState(false);
    // const [updateTimestamp, setUpdateTimestamp] = useState(0);
    // const [figUpdateTimestamp, setFigUpdateTimestamp] = useState(0);

    const roleInfoEditModalRef = useRef<RoleInfoEditModalRef>(null);

    

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

    // async function reloadAll() {
    //     let res = await getWorldViews()
    //     setWorldViewList(res.data);
    //     setWorldViewId(res.data?.[0].id || null);

    //     loadRoleDefList();
    // }

    // useEffect(() => {
    //     loadRoleDefList();
    // }, [worldViewId]);

    // useEffect(() => {
    //     reloadAll();
    // }, []);


    /**
     * 渲染角色列表标题
     * @returns 
     */
    // const roleListTitle = (
    //     <Space>
    //         <label>世界观：</label>
    //         <Select 
    //             style={{ width: 170 }} 
    //             allowClear value={worldViewId} 
    //             onChange={(value) => setWorldViewId(value)}
    //             onClear={() => setWorldViewId(null)}
    //         >
    //             {worldViewList.map((item) => (
    //                 <Select.Option key={item.id} value={item.id}>{item.title}</Select.Option>
    //             ))}
    //         </Select>
    //         <Button type="primary" onClick={reloadAll}>刷新</Button>
    //     </Space>
    // );

    

    // const handleNodeClick = (roleId: string | number) => {
    //     let role = roleList.find(item => item.id == Number(roleId));
    //     if (role) {
    //         setSelectedRole(role);
    //     }
    // }

    // 更改角色属性的版本
    // const handleVersionChange = async (roleDef: IRoleData) => {
    //     try {
    //         await apiCalls.updateRole(roleDef);
    //         message.success('更新角色版本成功');


    //         // 刷新角色列表
    //         await loadRoleDefList() as IRoleData[];
    //         console.debug('handleVersionChange updateTimestamp --->> ', Date.now());
    //         setUpdateTimestamp(Date.now());
    //     } catch (error) {
    //         console.error('Failed to update role:', error);
    //         message.error('更新角色版本失败');
    //     }
    // };

    // 创建或更新角色属性
    // const handleCreateOrUpdateRoleInfo = async (roleDef: IRoleData, data: IRoleInfo) => {
    //     try {
    //         let response = null;

    //         delete data.created_at;
            
    //         if (data.id) {
    //             response = await apiCalls.updateRoleInfo(data);
    //         } else {
    //             response = await apiCalls.createRoleInfo(data);
    //         }

    //         message.success(data.id ? '更新角色版本成功' : '创建角色版本成功');
    //         setEditModalVisible(false);

    //         // 刷新角色列表
    //         await loadRoleDefList() as IRoleData[];
    //         console.debug('handleCreateOrUpdateRoleInfo updateTimestamp --->> ', Date.now());
    //         setUpdateTimestamp(Date.now());

    //     } catch (error) {
    //         console.error('Failed to create role info:', error);
    //         message.error('创建角色版本失败');
    //     }
    // };

    // const handleDeleteRoleInfo = async (roleDef: IRoleData, data: IRoleInfo) => {
    //     try {
    //         await apiCalls.deleteRoleInfo(data);
    //         await apiCalls.updateRole({ id: roleDef.id, version: null });
    //         message.success('删除成功');

    //         // 刷新角色列表
    //         await loadRoleDefList() as IRoleData[];
    //         console.debug('handleDeleteRoleInfo updateTimestamp --->> ', Date.now());
    //         setUpdateTimestamp(Date.now());
    //     } catch (error) {
    //         message.error('删除失败');
    //     }
    // }

    // 打开角色属性编辑模态框
    const handleOpenRoleInfoEditModal = (roleDef: IRoleData, data?: IRoleInfo) => {
        if (roleDef) {
            roleInfoEditModalRef.current?.openAndEdit(roleDef, data);
            setEditModalVisible(true);
        }
    };


    return (
        <RoleManageContextProvider>
            <div className="f-fit-height" style={{ paddingBottom: 10 }}>
                <Row className="f-fit-height" gutter={10}>
                    <Col className="f-fit-height" span={6}>
                        <RolePanel/>
                    </Col>
                {/* <Col className="f-fit-height" span={11}> */}
                    {/* <Card className="f-fit-height" title={
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
                    </Card> */}
                {/* </Col> */}
                <Col className="f-fit-height" span={18}>
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
                        <RoleInfoPanel
                            // roleDef={selectedRole}
                            // updateTimestamp={updateTimestamp}
                            // onVersionChange={handleVersionChange}
                            onOpenRoleInfoEditModal={handleOpenRoleInfoEditModal}
                            // onDeleteRoleInfo={handleDeleteRoleInfo}
                            // worldviewMap={worldviewMap}
                        />
                      ) : (
                        <RoleRelationPanel 
                            // roleId={selectedRole.id} 
                            // roleName={selectedRole.name!}
                            // candidateRoles={roleList}
                            // worldViews={worldViewList}
                            // worldViewId={worldViewId}
                            onUpdate={() => {
                                console.debug('handleRelationUpdate updateTimestamp --->> ', Date.now());
                                // setUpdateTimestamp(Date.now())
                            }}
                        />
                      )}
                    </Card>
                </Col>
            </Row>

            

            <RoleInfoEditModal
                ref={roleInfoEditModalRef}
                open={editModalVisible}
                onCancel={() => setEditModalVisible(false)}
                // onSubmit={handleCreateOrUpdateRoleInfo}
                // worldViewList={worldViewList}
                // roleData={selectedRole}
                />
            </div>
        </RoleManageContextProvider>
    )
}

interface RolePanelProps {
    
}

function RolePanel(props: RolePanelProps) {

    const [worldViewId, setWorldViewId] = useWorldViewId();
    const [worldViewList, setWorldViewList] = useWorldViewList();

    const [roleDefId, setRoleDefId] = useRoleId();
    const [roleInfoId, setRoleInfoId] = useRoleInfoId();
    const [roleDefList] = useRoleDefList();
    const [roleInfoList] = useRoleInfoList();

    const [factionList] = useFactionList();
    
    const loadRoleDefList = useLoadRoleDefList();
    const loadRoleInfoList = useLoadRoleInfoList();
    // const loadFactionList = useLoadFactionList();
    const [roleChromaMetadataList] = useRoleChromaMetadataList();

    const { isOpen, presetValues, openModal, closeModal } = useRoleDefModal();

    const loadWorldViewList = useLoadWorldViewList();

    // 创建 faction 映射表用于计算 fingerprint
    const factionMap = useMemo(() => {
        const map = new Map<number, IFactionDefData>();
        factionList.forEach(faction => {
            if (faction.id) {
                map.set(faction.id, faction);
            }
        });
        return map;
    }, [factionList]);

    useEffect(() => {
        console.warn('[RolePanel] useEffect triggered, worldViewId:', worldViewId);
        loadRoleDefList();
        loadRoleInfoList();
    }, [worldViewId])

    const roleManageTreeData = useMemo<TreeDataNode[]>(() => {
        // console.debug('roleManageTreeData --->> ', roleDefList, roleInfoList);

        return roleDefList.map(role => {
            return {
                title: role.name,
                key: 'def-' + role.id || '',
                data: role,
                children: roleInfoList.filter(info => info.role_id === role.id).map(info => {
                    return {
                        title: info.version_name,
                        key: 'info-' + info.id || '',
                        data: info,
                        parent: role,
                        isCurrent: info.id === role.version,
                    }
                })
            }
        })
    }, [roleDefList, roleInfoList]);

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
            loadRoleDefList();
            loadRoleInfoList();
        } catch (error) {
            message.error('删除失败');
        }
    };

    // 创建角色
    const handleCreateRole = async (values: { name?: string }) => {
        console.debug('createRole', values);

        await apiCalls.createRole({
            ...values,
        });
        // 重新加载角色列表
        loadRoleDefList();
        loadRoleInfoList();
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

    function reloadAll() {
        loadWorldViewList();
        loadRoleDefList();
    }

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

    return (
        <>
            <Card className="f-fit-height" title={roleListTitle}>
                <div className="f-flex-col">
                    <Alert style={{ marginBottom: 10 }} message="添加角色后，角色不会立即出现在世界观，需要添加关联世界观的角色属性版本，相关角色会显示感叹号" type="info" />
                    <Button 
                        className="f-fit-width" 
                        onClick={() => openModal()}
                    >
                        添加角色
                    </Button>
                    <Tree 
                        className="f-flex-1" 
                        treeData={roleManageTreeData}
                        onClick={(e, node) => {
                            if (node.key.startsWith('def-')) {
                                setRoleDefId(node.data.id);
                                setRoleInfoId(node.data.version);
                            } else if (node.key.startsWith('info-')) {
                                setRoleDefId(node.data.role_id);
                                setRoleInfoId(node.data.id);
                            }
                        }}
                        blockNode={true}
                        titleRender={(node: DataNode) => {
                            let suffix = [];
                            let hasChildren = node.children?.length || false;

                            let info_id = '';
                            let node_data_to_compare: any = {};

                            if (node.key.startsWith('def-')) {
                                suffix.push(<Tag key="version" color="green">{node.data?.version_name}</Tag>);
                                node_data_to_compare = node.children?.find((child: any) => child.isCurrent)?.data;
                                info_id = node_data_to_compare?.id || '';
                            } else if (node.key.startsWith('info-')) {
                                if (node.isCurrent) {
                                    suffix.push(<Tag key="current" color="blue">当前</Tag>);
                                }
                                node_data_to_compare = node.data;
                                info_id = node.data?.id || '';
                            }

                            // 在渲染时计算 fingerprint
                            let localFingerprint = '';
                            if (node_data_to_compare) {
                                localFingerprint = calculateRoleInfoFingerprint(node_data_to_compare, factionMap);
                            }

                            let chromaFingerprint = roleChromaMetadataList.find(
                                (item: IRoleChromaMetadata) => item.metadata.id === info_id
                            )?.metadata.fingerprint || '';
                            
                            // console.debug('fingerprint compare --->> ', { info_id, localFingerprint, chromaFingerprint });

                            if (chromaFingerprint) {
                                if (chromaFingerprint === localFingerprint) {
                                    suffix.push(<Tag key="vector" color="green">向量就绪</Tag>);
                                } else {
                                    suffix.push(<Tag key="vector" color="red">向量过时</Tag>);
                                }
                            } else if (node_data_to_compare) {
                                // suffix.push(<Tag key="vector" color="orange">未向量化</Tag>);
                            }

                            return (
                                <div className="f-flex-two-side">
                                    <Space>
                                        <span>{node.title}</span>
                                        {suffix}
                                    </Space>
                                    <Space>
                                        <Button type="link" size="small" icon={<EditOutlined />} />
                                        <Button type="link" size="small" disabled={hasChildren} danger icon={<DeleteOutlined />} />
                                    </Space>
                                </div>
                            )
                        }}
                    />
                </div>
            </Card>
            <RoleDefModal
                open={isOpen}
                onCancel={closeModal}
                onOk={values => handleCreateRole(values)}
                initialValues={presetValues}
                title="创建角色"
            />
        </>
    )
}


