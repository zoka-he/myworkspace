import { IGeoStarSystemData } from "@/src/types/IAiNoval";
import { Col, Row, Button, Space } from "antd";
import { type IGeoTreeItem } from "../geoTree";
import { isParentObject, useManageState, useObject } from "../ManageStateProvider";
import GeoEmbedDocument from "../subPanel/geoEmbedDocument";
interface IStarSystemEditProps {
    raiseAddStarSystem: (data: IGeoStarSystemData) => void,
    raiseAddStar: (data: IGeoStarSystemData) => void,
    raiseAddPlanet: (data: IGeoStarSystemData) => void,
    raiseEditStarSystem: (data: IGeoStarSystemData) => void,
    raiseDeleteStarSystem: (data: IGeoStarSystemData) => void,
    onRequestUpdate?: () => void,
}

export default function(props: IStarSystemEditProps) {

    // const { state: manageState } = useManageState();
    // const { treeRaisedObject } = manageState;

    let [data] = useObject();
    let described_in_llm = data?.described_in_llm == 1;
    let [isParent] = isParentObject();

    function onClickAddStar()  {
        if (typeof props.raiseAddStar === 'function' && data) {
            props.raiseAddStar(data);
        }
    }

    function onClickAddPlanet() {
        if (typeof props.raiseAddPlanet === 'function' && data) {
            props.raiseAddPlanet(data);
        }
    }

    function onClickEditStarSystem() {
        if (typeof props.raiseEditStarSystem === 'function' && data) {
            props.raiseEditStarSystem(data);
        }
    }

    function onClickDeleteStarSystem() {
        if (typeof props.raiseDeleteStarSystem === 'function' && data) {
            props.raiseDeleteStarSystem(data);
        }
    }

    function onClickAddStarSystem() {
        if (typeof props.raiseAddStarSystem === 'function' && data) {
            props.raiseAddStarSystem(data);
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
                        <Button type="primary" size="small" onClick={e => onClickEditStarSystem()}>编辑本条目</Button>
                        <Button onClick={e => onClickAddStarSystem()} size="small">添加子天体系统</Button>
                        <Button onClick={e => onClickAddStar()} size="small">添加恒星</Button>
                        <Button onClick={e => onClickAddPlanet()} size="small">添加行星</Button>
                        <Button onClick={e => onClickDeleteStarSystem()} danger size="small" disabled={isParent}>删除本条目</Button>
                    </Space>
                </Col>
            </Row>


            <Row>
                <dl>
                    <dt>简介</dt><dd>{ data?.description }</dd>
                </dl>
                <dl>
                    <dt>是否在知识库中：</dt><dd>{ described_in_llm ? '是' : '否' }</dd>
                </dl>
            </Row>

            <GeoEmbedDocument geoData={data} />
        </div>
    )
}