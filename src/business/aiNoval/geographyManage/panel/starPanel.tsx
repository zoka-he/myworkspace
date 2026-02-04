import { IGeoStarData } from "@/src/types/IAiNoval";
import { Col, Row, Button, Space } from "antd";
import { type IGeoTreeItem } from "../geoTree";
import { useManageState, useObject } from "../ManageStateProvider";
import GeoEmbedDocument from "../subPanel/geoEmbedDocument";

interface IStarEditProps {
    // raiseAddStar: () => void,
    // raiseAddPlanet: () => void,
    raiseEditStar: (data: IGeoStarData) => void,
    raiseDeleteStar: (data: IGeoStarData) => void,
    onRequestUpdate?: () => void,
}

export default function(props: IStarEditProps) {

    // const { state: manageState } = useManageState();
    // const { treeRaisedObject } = manageState;

    let [data] = useObject();
    let described_in_llm = data?.described_in_llm == 1;

    function onClickEditStar() {
        if (typeof props.raiseEditStar === 'function' && data) {
            props.raiseEditStar(data);
        }
    }

    function onClickDeleteStar() {
        if (typeof props.raiseDeleteStar === 'function' && data) {
            props.raiseDeleteStar(data);
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
                        <Button type="primary" size="small" onClick={e => onClickEditStar()}>编辑本条目</Button>
                        {/* <Button onClick={e => onClickAddStar()}>添加恒星</Button>
                        <Button onClick={e => onClickAddPlanet()}>添加行星</Button> */}
                        <Button onClick={e => onClickDeleteStar()} danger size="small">删除本条目</Button>
                    </Space>
                </Col>
            </Row>


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

            <GeoEmbedDocument geoData={data} />
        </div>
    )
}