import { IGeoStarSystemData } from "@/src/types/IAiNoval";
import { Col, Row, Button, Space, Divider, Tabs } from "antd";
import { type IGeoTreeItem } from "../geoTree";
import GeoRecallTest from "../subPanel/geoRecallTest";
import GeoDifyDocument from "../subPanel/geoDifyDocument";

interface IStarSystemEditProps {
    worldViewId: number | null,
    updateTimestamp: number,
    node: IGeoTreeItem<IGeoStarSystemData> | null,
    raiseAddStar: (data: IGeoStarSystemData) => void,
    raiseAddPlanet: (data: IGeoStarSystemData) => void,
    raiseEditStarSystem: (data: IGeoStarSystemData) => void,
    raiseDeleteStarSystem: (data: IGeoStarSystemData) => void,
}

export default function(props: IStarSystemEditProps) {

    let data = props?.node?.data;
    let described_in_llm = data?.described_in_llm == 1;
    let isParent = (props?.node?.children?.length || 0) > 0;

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

    let tabItems = [
        {
            label: `Dify文档`,
            key: '1',
            children: <GeoDifyDocument worldViewId={props.worldViewId} geoDataType="starSystem" geoData={data} />,
        },
        {
            label: `LLM召回测试`,
            key: '2',
            children: <GeoRecallTest worldViewId={props.worldViewId} recommandQuery={`太阳系 ${data?.name} 设定`} />,
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
                        <Button type="primary" size="small" onClick={e => onClickEditStarSystem()}>编辑本条目</Button>
                        <Button onClick={e => onClickAddStar()} size="small">添加恒星</Button>
                        <Button onClick={e => onClickAddPlanet()} size="small">添加行星</Button>
                        <Button onClick={e => onClickDeleteStarSystem()} danger size="small" disabled={isParent}>删除本条目</Button>
                    </Space>
                </Col>
            </Row>
            <Divider style={{ margin: '10px 0' }} />
            <Row>
                {/* <dl>
                    <dt>简介</dt><dd>{ data?.description }</dd>
                </dl> */}
                <dl>
                    <dt>是否在知识库中：</dt><dd>{ described_in_llm ? '是' : '否' }</dd>
                </dl>
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