import { IGeoPlanetData } from "@/src/types/IAiNoval";
import { Col, Row, Button, Space, Divider } from "antd";
import { type IGeoTreeItem } from "../geoTree";

interface IStarEditProps {
    worldViewId: number | null,
    updateTimestamp: number,
    node: IGeoTreeItem<IGeoPlanetData> | null,
    raiseAddSatellite: (data: IGeoPlanetData) => void,
    raiseAddGeographicUnit: (data: IGeoPlanetData) => void,
    raiseEditPlanet: (data: IGeoPlanetData) => void,
    raiseDeletePlanet: (data: IGeoPlanetData) => void,
}

export default function(props: IStarEditProps) {

    let data = props?.node?.data;
    let described_in_llm = data?.described_in_llm == 1;
    let isParent = (props?.node?.children?.length || 0) > 0;

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
        </div>
    )
}