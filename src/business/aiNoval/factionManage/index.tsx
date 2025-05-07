import { Button, Card, Col, message, Row, Select, Space } from "antd";
import { useEffect, useState, useRef } from "react";
import { getWorldViews } from "../common/worldViewUtil";
import { IWorldViewData, IFactionDefData } from "@/src/types/IAiNoval";
import FactionEdit, { FactionEditRef } from "./edit/factionEdit";
import FactionTree from "./factionTree";
import apiCalls from "./apiCalls";

export default function FactionManage() {
    const [worldViewId, setWorldViewId] = useState<number | null>(null);
    const [worldViewData, setWorldViewData] = useState<IWorldViewData[]>([]);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [treeTimestamp, setTreeTimestamp] = useState<number>(Date.now());
    const factionEditRef = useRef<FactionEditRef>(null);

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

    const handleEditOk = async (values: IFactionDefData) => {
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
            setTreeTimestamp(Date.now()); // Refresh the tree after successful operation
        } catch (error) {
            console.error('Operation failed:', error);
            message.error(values.id ? '阵营更新失败' : '阵营创建失败');
        }
    };

    const handleEditCancel = () => {
        setEditModalVisible(false);
    };

    const handleAddChild = (faction: IFactionDefData) => {
        setEditModalVisible(true);
        factionEditRef.current?.setFormValues({
            worldview_id: worldViewId,
            parent_id: faction.id
        } as IFactionDefData);
    };

    const handleDelete = async (faction: IFactionDefData) => {
        if (!faction.id) {
            message.error('无效的阵营ID');
            return;
        }
        try {
            await apiCalls.deleteFaction(faction.id);
            message.success('阵营删除成功');
            setTreeTimestamp(Date.now());
        } catch (error) {
            console.error('Delete failed:', error);
            message.error('阵营删除失败');
        }
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

    return (
        <div className="f-fit-height" style={{ padding: '0 0 10px 0' }}>
            <Row className="f-fit-height" gutter={10}>
                <Col className="f-fit-height" span={6}>
                    <Card className="f-fit-height" title={facionTreeTitle}>
                        <div>
                            <Button 
                                style={{ width: '100%' }} 
                                onClick={handleAddRootFaction}
                                disabled={!worldViewId}
                            >
                                添加根阵营
                            </Button>
                            <div style={{ marginTop: '10px' }}>
                                <FactionTree
                                    worldViewId={worldViewId}
                                    onAddChild={handleAddChild}
                                    onDelete={handleDelete}
                                    timestamp={treeTimestamp}
                                />
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col className="f-fit-height" span={12}>
                    <Card className="f-fit-height" title="阵营关系图"></Card>
                </Col>
                <Col className="f-fit-height" span={6}>
                    <Card className="f-fit-height" title="阵营属性"></Card>
                </Col>
            </Row>

            <FactionEdit
                ref={factionEditRef}
                visible={editModalVisible}
                onOk={handleEditOk}
                onCancel={handleEditCancel}
            />
        </div>
    )
}