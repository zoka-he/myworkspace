import { Button, Card, Col, message, Row, Select, Space, Modal, Radio } from "antd";
import { useEffect, useState, useRef } from "react";
import { getWorldViews } from "../common/worldViewUtil";
import { IWorldViewData, IFactionDefData } from "@/src/types/IAiNoval";
import FactionEdit, { FactionEditRef } from "./edit/factionEdit";
import FactionTree from "./factionTree";
import FactionInfoPanel from "./panels/factionInfoPanel";
import { D3FactionView } from "./panels/factionRelationMap";
import apiCalls from "./apiCalls";

export default function FactionManage() {
    const [worldViewId, setWorldViewId] = useState<number | null>(null);
    const [worldViewData, setWorldViewData] = useState<IWorldViewData[]>([]);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [treeTimestamp, setTreeTimestamp] = useState<number>(Date.now());
    const [selectedFaction, setSelectedFaction] = useState<IFactionDefData | null>(null);
    const factionEditRef = useRef<FactionEditRef>(null);

    const [factionInfoPanelId, setFactionInfoPanelId] = useState<string>('factionInfo');

    async function initWorldViewData() {
        let { data, count } = await getWorldViews();
        setWorldViewData(data);

        if (count === 0) {
            message.error('世界观数据为空，请检查数据状态！');
            return;
        }

        if (data.length > 100) {
            message.error('世界观数量超出正常需求，请检查数据状态！');
        }

        setWorldViewId(data[0]?.id || null);
        setTreeTimestamp(Date.now());
    }

    useEffect(() => {
        initWorldViewData();
    }, []);

    const handleAddRootFaction = () => {
        if (!worldViewId) {
            message.warning('请先选择世界观');
            return;
        }
        setEditModalVisible(true);
        // Set initial values for the new root faction
        factionEditRef.current?.setFormValues({
            worldview_id: worldViewId,
            parent_id: null
        } as IFactionDefData);
    };

    const handleFactionDefUpdate = async (values: IFactionDefData) => {
        try {
            if (values.id) {
                // Update existing faction
                await apiCalls.updateFaction(values);
                message.success('阵营更新成功');
            } else {
                // Create new faction
                await apiCalls.addFaction(values);
                message.success('阵营创建成功');
            }
            setEditModalVisible(false);
            setSelectedFaction(null);
            setTreeTimestamp(Date.now()); // Refresh the tree after successful operation
        } catch (error) {
            console.error('Operation failed:', error);
            message.error(values.id ? '阵营更新失败' : '阵营创建失败');
        }
    };

    const handleEditCancel = () => {
        setEditModalVisible(false);
    };

    const handleAddChildFactionDef = (faction: IFactionDefData) => {
        setEditModalVisible(true);
        factionEditRef.current?.setFormValues({
            worldview_id: worldViewId,
            parent_id: faction.id
        } as IFactionDefData);
    };

    const handleEditFactionDef = (faction: IFactionDefData) => {
        setEditModalVisible(true);
        factionEditRef.current?.setFormValues(faction);
    }

    const handleDeleteFactionDef = async (faction: IFactionDefData) => {
        if (!faction.id) {
            message.error('无效的阵营ID');
            return;
        }

        const factionId = faction.id; // Store the ID in a variable to satisfy TypeScript
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除阵营"${faction.name}"吗？`,
            okText: '确认',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await apiCalls.deleteFaction(factionId);
                    message.success('阵营删除成功');
                    setSelectedFaction(null);
                    setTreeTimestamp(Date.now());
                } catch (error) {
                    console.error('Delete failed:', error);
                    message.error('阵营删除失败');
                }
            }
        });
    };

    const handleFactionSelect = (faction: IFactionDefData) => {
        setSelectedFaction(faction);
    };

    const facionTreeTitle = (
        <Space>
            <label>阵营树</label>
            <Select style={{ width: 200 }} value={worldViewId} onChange={(value) => setWorldViewId(value)}>
                {worldViewData.map((item) => (
                    <Select.Option value={item.id} key={item.id}>{item?.title || '未命名阵营'}</Select.Option>
                ))}
            </Select>
            <Button type="primary" onClick={() => initWorldViewData()}>刷新</Button>
        </Space>
    )

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
        </Radio.Group>
    )

    return (
        <div className="f-fit-height" style={{ padding: '0 0 10px 0' }}>
            <Row className="f-fit-height" gutter={10}>
                <Col className="f-fit-height" span={6}>
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
                                    worldViewId={worldViewId}
                                    onAddChild={handleAddChildFactionDef}
                                    onDelete={handleDeleteFactionDef}
                                    onSelect={handleFactionSelect}
                                    timestamp={treeTimestamp}
                                />
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col className="f-fit-height" span={12}>
                    <Card className="f-fit-height" title="阵营关系图">
                        {worldViewId && (
                            <D3FactionView 
                                worldViewId={worldViewId.toString()} 
                                updateTimestamp={treeTimestamp} 
                            />
                        )}
                    </Card>
                </Col>
                <Col className="f-fit-height" span={6}>
                    <Card className="f-fit-height" title={factionInfoTitle}>
                        {factionInfoPanelId === 'factionInfo' && (
                            <FactionInfoPanel faction={selectedFaction || undefined} onEdit={faction => handleEditFactionDef(faction)} />
                        )}
                    </Card>
                </Col>
            </Row>

            <FactionEdit
                ref={factionEditRef}
                visible={editModalVisible}
                onOk={handleFactionDefUpdate}
                onCancel={handleEditCancel}
            />
        </div>
    )
}