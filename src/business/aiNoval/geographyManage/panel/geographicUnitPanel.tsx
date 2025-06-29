import { IGeoGeographyUnitData } from "@/src/types/IAiNoval";
import { Col, Row, Button, Space, Divider, Tabs } from "antd";
import { type IGeoTreeItem } from "../geoTree";
import GeoRecallTest from "../subPanel/geoRecallTest";
import GeoDifyDocument from "../subPanel/geoDifyDocument";

interface IGeographyUnitPanelProps {
    worldViewId: number | null,
    updateTimestamp: number,
    node: IGeoTreeItem<IGeoGeographyUnitData> | null,
    raiseAddGeographicUnit: (data: IGeoGeographyUnitData) => void,
    raiseEditGeographicUnit: (data: IGeoGeographyUnitData) => void,
    raiseDeleteGeographicUnit: (data: IGeoGeographyUnitData) => void,
    onRequestUpdate?: () => void,
}

export default function(props: IGeographyUnitPanelProps) {

    let data = props?.node?.data;

    let described_in_llm = data?.described_in_llm == 1;
    let isParent = (props?.node?.children?.length || 0) > 0;


    function onClickAddGeographicUnit() {
        if (typeof props.raiseAddGeographicUnit === 'function' && data) {
            props.raiseAddGeographicUnit(data);
        }
    }

    function onClickEditGeographicUnit() {
        if (typeof props.raiseEditGeographicUnit === 'function' && data) {
            props.raiseEditGeographicUnit(data);
        }
    }

    function onClickDeleteGeographicUnit() {
        if (typeof props.raiseDeleteGeographicUnit === 'function' && data) {
            props.raiseDeleteGeographicUnit(data);
        }
    }

    let tabItems = [
        {
            label: `Dify文档`,
            key: '1',
            children: <GeoDifyDocument worldViewId={props.worldViewId} geoDataType="geographyUnit" geoData={data} onRequestUpdate={props.onRequestUpdate} />,
        },
        {
            label: `LLM召回测试`,
            key: '2',
            children: <GeoRecallTest worldViewId={props.worldViewId} recommandQuery={`${data?.name} 设定`} />,
        }
    ];

    return (
        <div style={{ height: '100%' }}>
            <Row>
                <Col span={12}>
                    <h4>{data?.name}</h4>
                    <dl>
                        <dt>地理编码：</dt><dd>{data?.code}</dd>
                    </dl>
                </Col>
                <Col span={12}>
                    <Space>
                        <Button type="primary" size="small" onClick={e => onClickEditGeographicUnit()}>编辑本条目</Button>
                        <Button onClick={e => onClickAddGeographicUnit()} size="small">添加地理单元</Button>
                        <Button onClick={e => onClickDeleteGeographicUnit()} danger size="small" disabled={isParent}>删除本条目</Button>
                    </Space>
                </Col>
            </Row>
            <Divider style={{ margin: '10px 0' }} />
            <Row>
                <Col span={24}>
                    <dl>
                        <dt>简介：</dt><dd>{ data?.description }</dd>
                    </dl>
                    <dl>
                        <dt>是否在知识库中：</dt><dd>{ described_in_llm ? '是' : '否' }</dd>
                    </dl>
                </Col>
            </Row>

            <Tabs
                defaultActiveKey="1"
                type="card"
                size="small"
                style={{ marginBottom: 32 }}
                items={tabItems}
            />
        </div>
    )
}