import { Form, InputNumber, Descriptions, Space, Input, Select } from "antd";
import IWheelData from "./IWheelData";
import RightView from "./RightView";
import BackView from "./BackView";
import IRimProps from "./IRimProps";
import IHubProps from "./IHubProps";
import calculateSpokeLength from "./calculateSpokeLength";

interface IEditorProps {
    data?: IWheelData
    readonly?: boolean
}

export default function(props: IEditorProps) {

    let isReadonly = false;
    if (props.readonly !== undefined) {
        isReadonly = props.readonly;
    }

    let rimProps: IRimProps = { 
        rimHeight: 25, 
        rimRadius: 311, 
        tyreWidth: 23 
    };

    // 参考DA9000后花鼓 https://bike.shimano.com/zh-CN/product/component/duraace-9000/FH-9000.html
    let hubProps: IHubProps = {
        hubLength: 130,
        coreRadius: 9,
        flange1Radius: 44 / 2,
        flange1Pos: 130 / 2 - 56.9 / 2 - 9.75,
        flange1Deg: 0,
        flange2Radius: 44 / 2,
        flange2Pos: 130 / 2 - 56.9 / 2 - 9.75,
        flange2Deg: 15,
        flange3Radius: 45 / 2,
        flange3Pos: 130 / 2 - 56.9 / 2 + 9.75,
        flange3Deg: 30,
        flange4Radius: 45 / 2,
        flange4Pos: 130 / 2 - 56.9 / 2 + 9.75,
        flange4Deg: 45,
        holeRadius: 0,
        holeCount: 32, // 24 28 32 36
    }

    function formatNumber(n: any, fixed: number = 2) {
        if (typeof n === "number") {
            return n.toFixed(fixed);
        } else {
            return '--';
        }
    }

    let result = calculateSpokeLength({ ...rimProps, ...hubProps }, [-6, 6, 6, -6]);

    if (isReadonly) {
        return (
            <Space size={30}>
                <div>
                    <Descriptions title="轮圈" bordered column={2} size="small">
                        <Descriptions.Item label="品牌" span={2}>&nbsp;</Descriptions.Item>
                        <Descriptions.Item label="型号" span={2}>&nbsp;</Descriptions.Item>
                        <Descriptions.Item label="轮径">{formatNumber(rimProps.rimRadius)}</Descriptions.Item>
                        <Descriptions.Item label="框高">{formatNumber(rimProps.rimHeight)}</Descriptions.Item>
                        <Descriptions.Item label="孔数">{formatNumber(hubProps.holeCount, 0)}</Descriptions.Item>
                    </Descriptions>

                    <p></p>

                    <Descriptions title="花鼓" bordered column={2} size="small">
                        <Descriptions.Item label="品牌" span={2}>&nbsp;</Descriptions.Item>
                        <Descriptions.Item label="型号" span={2}>&nbsp;</Descriptions.Item>
                        <Descriptions.Item label="左外PCD">{formatNumber(hubProps.flange1Radius)}</Descriptions.Item>
                        <Descriptions.Item label="右内PCD">{formatNumber(hubProps.flange3Radius)}</Descriptions.Item>
                        <Descriptions.Item label="左外距">{formatNumber(hubProps.flange1Pos)}</Descriptions.Item>
                        <Descriptions.Item label="右内距">{formatNumber(hubProps.flange3Pos)}</Descriptions.Item>
                        <Descriptions.Item label="左内PCD">{formatNumber(hubProps.flange2Radius)}</Descriptions.Item>
                        <Descriptions.Item label="右外PCD">{formatNumber(hubProps.flange4Radius)}</Descriptions.Item>
                        <Descriptions.Item label="左内距">{formatNumber(hubProps.flange2Pos)}</Descriptions.Item>
                        <Descriptions.Item label="右外距">{formatNumber(hubProps.flange4Pos)}</Descriptions.Item>
                    </Descriptions>
                </div>
                <div>
                    <div className="f-flex-row">
                        <RightView rimProps={rimProps} hubProps={hubProps}/>
                        <BackView rimProps={rimProps} hubProps={hubProps}/>
                    </div>
                    <p></p>
                    <Descriptions title="辐条" bordered column={2} size="small">
                        <Descriptions.Item label="编法" span={2}>&nbsp;</Descriptions.Item>
                        <Descriptions.Item label="左外">{formatNumber(result[0][0])}mm * {formatNumber(result[0][1], 0)}</Descriptions.Item>
                        <Descriptions.Item label="左内">{formatNumber(result[1][0])}mm * {formatNumber(result[1][1], 0)}</Descriptions.Item>
                        <Descriptions.Item label="右外">{formatNumber(result[2][0])}mm * {formatNumber(result[2][1], 0)}</Descriptions.Item>
                        <Descriptions.Item label="右内">{formatNumber(result[3][0])}mm * {formatNumber(result[3][1], 0)}</Descriptions.Item>
                    </Descriptions>
                </div>
            </Space>
        )
    } else {
        return (
            <Space size={30}>
                <div>
                    <Descriptions title="轮圈" bordered column={2} size="small">
                        <Descriptions.Item label="品牌" span={2}><Input/></Descriptions.Item>
                        <Descriptions.Item label="型号" span={2}><Input/></Descriptions.Item>
                        <Descriptions.Item label="轮径"><Input/></Descriptions.Item>
                        <Descriptions.Item label="框高"><Input/></Descriptions.Item>
                        <Descriptions.Item label="孔数"><Input/></Descriptions.Item>
                    </Descriptions>

                    <p></p>

                    <Descriptions title="花鼓" bordered column={2} size="small">
                        <Descriptions.Item label="品牌" span={2}><Input/></Descriptions.Item>
                        <Descriptions.Item label="型号" span={2}><Input/></Descriptions.Item>
                        <Descriptions.Item label="左外PCD"><Input/></Descriptions.Item>
                        <Descriptions.Item label="右内PCD"><Input/></Descriptions.Item>
                        <Descriptions.Item label="左外距"><Input/></Descriptions.Item>
                        <Descriptions.Item label="右内距"><Input/></Descriptions.Item>
                        <Descriptions.Item label="左内PCD"><Input/></Descriptions.Item>
                        <Descriptions.Item label="右外PCD"><Input/></Descriptions.Item>
                        <Descriptions.Item label="左内距"><Input/></Descriptions.Item>
                        <Descriptions.Item label="右外距"><Input/></Descriptions.Item>
                    </Descriptions>
                </div>
                <div>
                    <div className="f-flex-row">
                        <RightView rimProps={rimProps} hubProps={hubProps}/>
                        <BackView rimProps={rimProps} hubProps={hubProps}/>
                    </div>
                    <p></p>
                    <Descriptions title="辐条" bordered column={2} size="small">
                        <Descriptions.Item label="编法" span={2}><Select></Select></Descriptions.Item>
                        <Descriptions.Item label="左外"><Input/></Descriptions.Item>
                        <Descriptions.Item label="左内"><Input/></Descriptions.Item>
                        <Descriptions.Item label="右外"><Input/></Descriptions.Item>
                        <Descriptions.Item label="右内"><Input/></Descriptions.Item>
                    </Descriptions>
                </div>
            </Space>
        )
    }
}