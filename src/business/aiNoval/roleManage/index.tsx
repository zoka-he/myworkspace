import { Row, Col, Card, Space, Button, Select, List, Modal, message, Alert, Table, Typography, Radio, Tree, TreeProps, TreeDataNode, Tag, notification } from "antd";
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
import RoleManageContextProvider, { useFactionList, useLoadFactionList, useLoadRoleDefList, useLoadRoleInfoList, useLoadWorldViewList, useRoleDefList, useRoleId, useRoleInfoList, useWorldViewId, useWorldViewList, useRoleInfoId, useRoleChromaMetadataList, calculateRoleInfoFingerprint, IRoleChromaMetadata, useLoadRoleChromaMetadataList } from "./roleManageContext";
import { IFactionDefData } from "@/src/types/IAiNoval";
import _ from 'lodash';
import { getRabbitMQClient, RabbitMQClient } from "@/src/utils/rabbitmq";
import { IMessage } from "@stomp/stompjs";
import { QueryTestPanel } from "./panel/queryTestPanel";    

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

    // 打开角色属性编辑模态框
    const handleOpenRoleInfoEditModal = (roleDef: IRoleData, data?: IRoleInfo) => {
        if (roleDef) {
            roleInfoEditModalRef.current?.openAndEdit(roleDef, data);
            setEditModalVisible(true);
        }
    };

    let content = null;
    switch (activePanel) {
        case 'attributes':
            content = <RoleInfoPanel onOpenRoleInfoEditModal={handleOpenRoleInfoEditModal} />;
            break;
        case 'relations':
            content = <RoleRelationPanel onUpdate={() => {}} />;
            break;
        case 'query':
            content = <QueryTestPanel />;
            break;
    }


    return (
        <RoleManageContextProvider>
            <div className="f-fit-height" style={{ paddingBottom: 10 }}>
                <Row className="f-fit-height" gutter={8}>
                    <Col className="f-fit-height" span={7}>
                        <RolePanel/>
                    </Col>
                <Col className="f-fit-height" span={17}>
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
                          <Radio.Button value="query">查询测试</Radio.Button>
                        </Radio.Group>
                      }
                    >
                      {content}
                    </Card>
                </Col>
            </Row>

            

            <RoleInfoEditModal
                ref={roleInfoEditModalRef}
                open={editModalVisible}
                onCancel={() => setEditModalVisible(false)}
            />
            </div>

            <MqProvider></MqProvider>
        </RoleManageContextProvider>
    )
}

interface MqProviderProps {
    children?: ReactNode;
}

function MqProvider({ children }: MqProviderProps) {
    const mqClient = useRef<RabbitMQClient | null>(null);
    const subscriptionIdRef = useRef<string | null>(null); // 跟踪订阅ID，确保只订阅一次
    const loadRoleChromaMetadataList = useLoadRoleChromaMetadataList(); // 使用优化后的 hook，总是使用最新的 worldViewId

    useEffect(() => {
        // 如果已经订阅过，不再重复订阅
        if (subscriptionIdRef.current) {
            return;
        }

        const client = mqClient.current = getRabbitMQClient();
        if (client) {
            // 即使未连接也可以调用 subscribe，连接建立后会自动订阅
            const subscriptionId = client.subscribe({
                destination: '/exchange/frontend_notice.fanout',
                id: 'frontend_notice_subscription', // 使用固定ID，确保只订阅一次
            }, (message: IMessage) => {
                console.debug('message --->> ', message);
                let body = JSON.parse(message.body);
                if (body.type === 'embed_task_completed') {
                    // 直接调用，函数内部总是使用最新的 worldViewId
                    loadRoleChromaMetadataList();
                }
                message.ack();
            });
            
            subscriptionIdRef.current = subscriptionId;
        }

        // 清理函数：组件卸载时取消订阅
        return () => {
            if (mqClient.current && subscriptionIdRef.current) {
                mqClient.current.unsubscribe(subscriptionIdRef.current);
                subscriptionIdRef.current = null;
            }
        };
    }, [loadRoleChromaMetadataList]); // 依赖 loadRoleChromaMetadataList，但由于它使用 useCallback 返回稳定引用，不会导致重复订阅

    // const [isConnected, setIsConnected] = useState(false);

    // useEffect(() => {
    //     if (!mqClient.current) {
    //         mqClient.current = getRabbitMQClient();
    //     }

    //     // 如果客户端存在但未连接，尝试连接
    //     if (mqClient.current && !mqClient.current.isConnected) {
    //         mqClient.current.connect();
    //     }

    //     // 定期检查连接状态
    //     const checkConnection = () => {
    //         const connected = mqClient.current?.isConnected || false;
    //         setIsConnected(connected);
    //     };

    //     // 初始检查
    //     checkConnection();

    //     // 设置轮询检查连接状态（每500ms检查一次）
    //     const intervalId = setInterval(checkConnection, 500);

    //     return () => {
    //         clearInterval(intervalId);
    //     };
    // }, []);

    // const prevConnectedRef = useRef<boolean | null>(null);
    
    // useEffect(() => {
    //     // 只在状态变化时显示通知，避免重复通知
    //     if (prevConnectedRef.current !== null && prevConnectedRef.current !== isConnected) {
    //         if (!isConnected) {
    //             notification.error({
    //                 message: 'RabbitMQ 连接失败',
    //                 description: '请检查 RabbitMQ 连接配置',
    //             });
    //         } else {
    //             notification.success({
    //                 message: 'RabbitMQ 连接成功',
    //                 description: '连接成功',
    //             });
    //         }
    //     }
    //     prevConnectedRef.current = isConnected;
    // }, [isConnected]);

    // 这个组件只用于监控连接状态，不渲染任何内容
    return null;
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
    const loadRoleChromaMetadataList = useLoadRoleChromaMetadataList();

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
    const handleCreateRole = async (values: { name?: string; is_enabled?: 'Y' | 'N' }) => {
        console.debug('createRole', values);

        await apiCalls.createRole({
            name: values.name,
            is_enabled: values.is_enabled ?? 'Y',
        });
        // 重新加载角色列表
        loadRoleDefList();
        loadRoleInfoList();
    };

    // 更新角色定义
    const handleUpdateRole = async (values: { name?: string; id?: number; is_enabled?: 'Y' | 'N' }) => {
        if (!values.id) return;
        await apiCalls.updateRole({ id: values.id, name: values.name || '', is_enabled: values.is_enabled ?? 'Y' } as IRoleData);
        message.success('更新成功');
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
        loadRoleInfoList();
        loadRoleChromaMetadataList();
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
                        onClick={(e, node: any) => {
                            const keyStr = String(node.key);
                            if (keyStr.startsWith('def-') && node.data) {
                                setRoleDefId(node.data.id);
                                setRoleInfoId(node.data.version);
                            } else if (keyStr.startsWith('info-') && node.data) {
                                setRoleDefId(node.data.role_id);
                                setRoleInfoId(node.data.id);
                            }
                        }}
                        blockNode={true}
                        titleRender={(node: any) => {
                            const keyStr = String(node.key);
                            let suffix = [];
                            let actions = [];
                            let hasChildren = node.children?.length || false;

                            let info_id = '';
                            let node_data_to_compare: any = {};

                            if (keyStr.startsWith('def-')) {
                                const defData = node.data as IRoleData | undefined;
                                suffix.push(<Tag key="version" color="green">{defData?.version_name}</Tag>);
                                node_data_to_compare = (node.children as any[])?.find((child: any) => child.isCurrent)?.data;
                                info_id = node_data_to_compare?.id != null ? String(node_data_to_compare.id) : '';
                            } else if (keyStr.startsWith('info-')) {
                                if (node.isCurrent) {
                                    suffix.push(<Tag key="current" color="blue">当前</Tag>);
                                }
                                node_data_to_compare = node.data;
                                info_id = (node.data as IRoleInfo)?.id != null ? String((node.data as IRoleInfo).id) : '';
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
                                    actions.push(<Tag key="vector" color="green">向量就绪</Tag>);
                                } else {
                                    actions.push(<Tag key="vector" color="red">向量过时</Tag>);
                                }
                            } else if (node_data_to_compare) {
                                // suffix.push(<Tag key="vector" color="orange">未向量化</Tag>);
                            }

                            const handleEditClick = (e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (keyStr.startsWith('def-') && node.data) {
                                    const roleData = node.data as IRoleData;
                                    openModal({ name: roleData.name ?? '', id: roleData.id ?? undefined, is_enabled: (roleData.is_enabled as 'Y' | 'N') ?? 'Y' });
                                }
                                // info 节点编辑由 RoleInfoEditModal 处理，此处仅处理 def 节点
                            };

                            const handleDeleteClick = (e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (keyStr.startsWith('def-') && node.data) {
                                    showDeleteConfirm(node.data as IRoleData);
                                }
                            };

                            const isDefDisabled = keyStr.startsWith('def-') && (node.data as IRoleData)?.is_enabled?.toUpperCase() === 'N';

                            return (
                                <div className="f-flex-two-side">
                                    <Space>
                                        <span style={isDefDisabled ? { textDecoration: 'line-through' } : undefined}>{node.title}</span>
                                        {suffix}
                                    </Space>
                                    <Space>
                                        {actions}
                                        {keyStr.startsWith('def-') && (
                                            <Button type="link" size="small" icon={<EditOutlined />} onClick={handleEditClick} />
                                        )}
                                        <Button type="link" size="small" disabled={!!hasChildren} danger icon={<DeleteOutlined />} onClick={handleDeleteClick} />
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
                onOk={values => presetValues?.id ? handleUpdateRole(values) : handleCreateRole(values)}
                initialValues={presetValues}
                title={presetValues?.id ? '编辑角色' : '创建角色'}
            />
        </>
    )
}


