import { IGeoPlanetData } from "@/src/types/IAiNoval";
import { Col, Row, Button, Space, Divider, Tabs } from "antd";
import { type IGeoTreeItem } from "../geoTree";
import GeoRecallTest from "../subPanel/geoRecallTest";
import GeoDifyDocument from "../subPanel/geoDifyDocument";
import { useSimpleWorldviewContext } from "../../common/SimpleWorldviewProvider";
import { useManageState } from "../ManageStateProvider";

interface IStarEditProps {
    raiseAddSatellite: (data: IGeoPlanetData) => void,
    raiseAddGeographicUnit: (data: IGeoPlanetData) => void,
    raiseEditPlanet: (data: IGeoPlanetData) => void,
    raiseDeletePlanet: (data: IGeoPlanetData) => void,
    onRequestUpdate?: () => void,
}

export default function(props: IStarEditProps) {

    const { state: worldviewState } = useSimpleWorldviewContext();
    const { worldviewId } = worldviewState;

    const { state: manageState } = useManageState();
    const { treeRaisedObject } = manageState;

    let data = treeRaisedObject?.data;
    let described_in_llm = data?.described_in_llm == 1;
    let isParent = (treeRaisedObject?.children?.length || 0) > 0;

    function onClickAddSatellite() {
        if (typeof props.raiseAddSatellite === 'function' && data) {
            props.raiseAddSatellite(data);
        }
    }

    function onClickAddGeographicUnit() {
        if (typeof props.raiseAddGeographicUnit === 'function' && data) {
            props.raiseAddGeographicUnit(data);
        }
    }

    function onClickEditPlanet() {
        if (typeof props.raiseEditPlanet === 'function' && data) {
            props.raiseEditPlanet(data);  
        }
    }

    function onClickDeletePlanet() {
        if (typeof props.raiseDeletePlanet === 'function' && data) {
            props.raiseDeletePlanet(data);
        }
    }

    let tabItems = [
        {
            label: `Dify文档`,
            key: '1',
            children: <GeoDifyDocument worldViewId={worldviewId} geoDataType="planet" geoData={data} onRequestUpdate={props.onRequestUpdate} />,
        },
        {
            label: `LLM召回测试`,
            key: '2',
            children: <GeoRecallTest worldViewId={worldviewId} recommandQuery={`行星 ${data?.name} 设定`} />,
        },
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
                        <Button type="primary" size="small" onClick={e => onClickEditPlanet()}>编辑本条目</Button>
                        <Button onClick={e => onClickAddSatellite()} size="small">添加卫星</Button>
                        <Button onClick={e => onClickAddGeographicUnit()} size="small">添加地理单元</Button>
                        <Button onClick={e => onClickDeletePlanet()} danger size="small" disabled={isParent}>删除本条目</Button>
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