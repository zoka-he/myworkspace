import { IGeoSatelliteData } from "@/src/types/IAiNoval";
import { Col, Row, Button, Space, Divider } from "antd";
import { type IGeoTreeItem } from "../geoTree";

interface IStarEditProps {
    worldViewId: number | null,
    updateTimestamp: number,
    node: IGeoTreeItem<IGeoSatelliteData> | null,
    raiseAddGeographicUnit: (data: IGeoSatelliteData) => void,
    raiseEditSatellite: (data: IGeoSatelliteData) => void,
    raiseDeleteSatellite: (data: IGeoSatelliteData) => void,
}

export default function(props: IStarEditProps) {

    let data = props?.node?.data;
    let described_in_llm = data?.described_in_llm == 1;
    let isParent = (props?.node?.children?.length || 0) > 0;

    function onClickAddGeographicUnit() {
        if (typeof props.raiseAddGeographicUnit === 'function' && data) {
            props.raiseAddGeographicUnit(data);
        }
    }

    function onClickEditSatellite() {
        if (typeof props.raiseEditSatellite === 'function' && data) {
            props.raiseEditSatellite(data);
        }
    }

    function onClickDeleteSatellite() {
        if (typeof props.raiseDeleteSatellite === 'function' && data) {
            props.raiseDeleteSatellite(data);
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
                        <Button type="primary" size="small" onClick={e => onClickEditSatellite()}>编辑本条目</Button>
                        <Button onClick={e => onClickAddGeographicUnit()} size="small">添加地理单元</Button>
                        <Button onClick={e => onClickDeleteSatellite()} danger size="small" disabled={isParent}>删除本条目</Button>
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