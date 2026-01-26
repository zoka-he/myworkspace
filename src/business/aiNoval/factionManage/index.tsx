import { Button, Card, Col, message, Row, Select, Space, Modal, Radio } from "antd";
import { useEffect, useState, useRef } from "react";
import { getWorldViews } from "../common/worldViewUtil";
import { IWorldViewData, IFactionDefData } from "@/src/types/IAiNoval";
import FactionEdit, { FactionEditRef } from "./edit/factionEdit";
import FactionTree from "./factionTree";
import FactionInfoPanel from "./panels/factionInfoPanel";
import { FactionRelationPanel } from "./panels/factionRelationPanel";
import { D3FactionView } from "./panels/factionRelationMap";
import FactionQueryTest from "./panels/factionQueryTest";
import apiCalls from "./apiCalls";
import FactionManageContextProvider, { useLoadWorldViewList, useLoadFactionList, useCurrentFactionId, useFactionList, useFactionTree, useWorldViewId, useWorldViewList, useCurrentFaction, useGetEditModal, useSetEditModalRef, useLoadFactionEmbedDocuments, useFactionEmbedDocuments } from "./FactionManageContext";
import { useMQ } from "@/src/components/context/aiNovel";
import { IMessage } from "@stomp/stompjs";

export default function FactionManage() {
    return (
        <FactionManageContextProvider>
            <FactionManageContent />
        </FactionManageContextProvider>
    );
}

function FactionManageContent() {
    const factionEditRef = useRef<FactionEditRef>(null);
    const setEditModalRef = useSetEditModalRef();

    useEffect(() => {
        setEditModalRef(factionEditRef);
    }, [setEditModalRef]);

    const handleFactionDefUpdate = async (values: IFactionDefData) => {
        try {
            if (values.id) {
                await apiCalls.updateFaction(values);
                message.success('阵营更新成功');
            } else {
                await apiCalls.addFaction(values);
                message.success('阵营创建成功');
            }
        } catch (error) {
            console.error('Operation failed:', error);
            message.error(values.id ? '阵营更新失败' : '阵营创建失败');
        }
    };

    const handleEditCancel = () => {};

    return (
        <InitFactionManage>
            <div className="f-fit-height" style={{ padding: '0 0 10px 0' }}>
                <Row className="f-fit-height" gutter={10}>
                    <Col className="f-fit-height" span={6}>
                        <LeftPanel />
                    </Col>
                    <Col className="f-fit-height" span={18}>
                        <RightPanel />
                    </Col>
                </Row>
                <FactionEdit
                    ref={factionEditRef}
                    // onOk={handleFactionDefUpdate}
                    // onCancel={handleEditCancel}
                />
            </div>
        </InitFactionManage>
    );
}

function InitFactionManage({ children }: { children: React.ReactNode }) {
    const [isReady, setIsReady] = useState(false);
    const loadWorldViewList = useLoadWorldViewList();
    const loadFactionList = useLoadFactionList();
    const [worldViewId, setWorldViewId] = useWorldViewId();
    const loadFactionEmbedDocuments = useLoadFactionEmbedDocuments();
    const { subscribe, unsubscribe } = useMQ();
    const subscriptionId = useRef<string | null>(null);
    const loadFactionEmbedDocumentsRef = useRef(loadFactionEmbedDocuments);

    // 保持 ref 为最新值
    useEffect(() => {
        loadFactionEmbedDocumentsRef.current = loadFactionEmbedDocuments;
    }, [loadFactionEmbedDocuments]);

    // 订阅 MQ 消息 - 独立于 isReady 状态
    useEffect(() => {
        // 如果已经订阅过，不再重复订阅
        if (subscriptionId.current) {
            return;
        }

        const id = subscribe({
            destination: '/exchange/frontend_notice.fanout',
            id: 'faction_manage_notice_subscription',
        }, (message: IMessage) => {
            try {
                const body = JSON.parse(message.body);
                if (body.type === 'embed_task_completed') {
                    // 使用 ref 来访问最新的函数，避免闭包问题
                    loadFactionEmbedDocumentsRef.current();
                }
                message.ack();
            } catch (error) {
                console.error('[InitFactionManage] Failed to parse message:', error);
                message.ack();
            }
        });

        subscriptionId.current = id;

        return () => {
            if (subscriptionId.current) {
                unsubscribe(subscriptionId.current);
                subscriptionId.current = null;
            }
        };
    }, [subscribe, unsubscribe]);

    // 初始化数据加载
    useEffect(() => {
        if (isReady) return;

        Promise.all([loadWorldViewList()])
        .then(([worldViewList]) => {
            if (worldViewList.length > 0) {
                setWorldViewId(worldViewList[0].id!);
                loadFactionList()
                loadFactionEmbedDocuments(worldViewList[0].id!)
            }
            setIsReady(true);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReady]);

    useEffect(() => {
        if (worldViewId) Promise.all([ loadFactionList(), loadFactionEmbedDocuments() ]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [worldViewId]);

    return isReady ? children : null;
}

function LeftPanel() {
    const [worldViewId, setWorldViewId] = useWorldViewId();
    const [worldViewList] = useWorldViewList();
    const loadWorldViewList = useLoadWorldViewList();
    const [currentFactionId, setCurrentFactionId] = useCurrentFactionId();
    const loadFactionList = useLoadFactionList();
    const loadFactionEmbedDocuments = useLoadFactionEmbedDocuments();
    const getEditModal = useGetEditModal();

    const handleAddRootFaction = () => {
        if (!worldViewId) {
            message.warning('请先选择世界观');
            return;
        }

        getEditModal()?.showAndEdit({
            worldview_id: worldViewId,
            parent_id: null
        } as IFactionDefData);
    };

    async function handleRefreshAll() {
        let worldViewList = await loadWorldViewList();
        if (worldViewList.length > 0) {
            setWorldViewId(worldViewList[0].id!);

            Promise.all([ loadFactionList(), loadFactionEmbedDocuments() ]);
        }
    }

    

    const facionTreeTitle = (
        <Space>
            <label>阵营树</label>
            <Select style={{ width: 200 }} value={worldViewId} onChange={(value) => setWorldViewId(value)}>
                {worldViewList.map((item) => (
                    <Select.Option value={item.id} key={item.id}>{item?.title || '未命名阵营'}</Select.Option>
                ))}
            </Select>
            <Button type="primary" onClick={() => handleRefreshAll()}>刷新</Button>
        </Space>
    );

    return (
        <Card className="f-fit-height" title={facionTreeTitle}>
            <div className="f-fit-height f-flex-col">
                <Button 
                    style={{ width: '100%', marginBottom: '10px' }} 
                    onClick={handleAddRootFaction}
                    disabled={!worldViewId}
                >
                    添加根阵营
                </Button>
                <div style={{ flex: 1, overflow: 'auto' }}>
                    <FactionTree
                        // worldViewId={worldViewId}
                        // factions={factionList}
                        // onAddChild={handleAddChildFactionDef}
                        // onDelete={handleDeleteFactionDef}
                        // onSelect={(faction) => setCurrentFactionId(faction.id!)}
                    />
                </div>
            </div>
        </Card>
    )
}

function RightPanel() {
    const [factionInfoPanelId, setFactionInfoPanelId] = useState<string>('factionInfo');
    const currentFaction = useCurrentFaction();
    const [worldViewList] = useWorldViewList();
    const [worldViewId] = useWorldViewId();
    const [factionList] = useFactionList();

    // const worldViewData = worldViewList.find((item) => item.id === worldViewId);

    const handleEditFactionDef = (faction: IFactionDefData) => {
        // setEditModalVisible(true);
        // factionEditRef.current?.setFormValues(faction);
    }

    const factionInfoTitle = (
        <Radio.Group
            value={factionInfoPanelId}
            optionType="button"
            buttonStyle="solid"
            onChange={(e) => setFactionInfoPanelId(e.target.value)}
        >
            <Radio.Button value="factionInfo">阵营属性</Radio.Button>
            <Radio.Button value="factionRelation">阵营关系</Radio.Button>
            <Radio.Button value="factionStatus">阵营状态</Radio.Button>
            <Radio.Button value="factionQuery">召回测试</Radio.Button>
        </Radio.Group>
    )

    return (
        <Card className="f-fit-height" title={factionInfoTitle}>
            {factionInfoPanelId === 'factionInfo' && (
                <FactionInfoPanel 
                    faction={currentFaction || undefined}
                    worldViewId={worldViewId}
                    onEdit={faction => handleEditFactionDef(faction)} 
                />
            )}
            {factionInfoPanelId === 'factionRelation' && (
                <FactionRelationPanel 
                    worldviewData={worldViewList}
                    currentFaction={currentFaction || undefined}
                    factions={factionList}
                    onRelationChange={() => {
                        // setTreeTimestamp(Date.now());
                    }}
                />
            )}
            {factionInfoPanelId === 'factionQuery' && (
                <FactionQueryTest 
                    worldViewId={worldViewId}
                />
            )}
        </Card>
    )
}