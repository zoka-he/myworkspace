import { Form, InputNumber, Descriptions, Space, Input, Select } from "antd";
import IWheelData from "./IWheelData";
import RightView from "./RightView";
import BackView from "./BackView";
import IRimProps from "./IRimProps";
import IHubProps from "./IHubProps";
import calculateSpokeLength from "./calculateSpokeLength";
import { useEffect, useState } from "react";

interface IEditorProps {
    data?: IWheelData
    readonly?: boolean
}

export default function(props: IEditorProps) {

    const [form] = Form.useForm();
    const [result, setResult] = useState([[0, 0], [0, 0], [0, 0], [0, 0]]);
    const [viewData, setViewData] = useState<null | IRimProps & IHubProps>(null);

    let data: (IRimProps & IHubProps) = { 
        rimHeight: 25, 
        rimRadius: 311, 
        tyreWidth: 23,
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

    function onFormValuesChange(changedData: any) {
        let formData = {
            ...form.getFieldsValue(),
            coreRadius: 9,
        };
        console.debug('formData', formData);
        setViewData(formData);
        setResult(calculateSpokeLength(formData, [-6, 6, 6, -6]));
    }

    useEffect(() => {
        form.setFieldsValue(data);
        setViewData(data);
        setResult(calculateSpokeLength(data, [-6, 6, 6, -6]));
    }, []);

    
    return (
        <Space size={30}>
            <div style={{width: 400}}>
                <Form form={form} title="轮圈" labelCol={{ span: 4 }} onValuesChange={onFormValuesChange}>
                    <h3>轮圈</h3>
                    <Form.Item label="型号">
                        <Input/>
                    </Form.Item>
                    <div className="f-flex-two-side">
                        <Form.Item label="轮径" labelCol={{span: 8}} name="rimRadius">
                            <InputNumber style={{width: 150}}/>
                        </Form.Item>
                        <Form.Item label="框高" labelCol={{span: 7}} name="rimHeight">
                            <InputNumber style={{width: 150}}/>
                        </Form.Item>
                    </div>
                    <div className="f-flex-two-side">
                        <Form.Item label="肽宽" labelCol={{span: 8}} name="tyreWidth">
                            <InputNumber style={{width: 150}}/>
                        </Form.Item>
                        <Form.Item label="孔数" labelCol={{span: 7}} name="holeCount">
                            <InputNumber style={{width: 150}}/>
                        </Form.Item>
                    </div>

                    <p></p>
                
                    <h3>花鼓</h3>
                    <Form.Item label="型号">
                        <Input/>
                    </Form.Item>
                    <Form.Item label="开档长度" name="hubLength">
                        <InputNumber style={{width: 120}}/>
                    </Form.Item>
                    <div className="f-flex-two-side">
                        <Form.Item label="左外PCD" labelCol={{span: 9}} name="flange1Radius">
                            <InputNumber style={{width: 120}}/>
                        </Form.Item>
                        <Form.Item label="右内PCD" labelCol={{span: 9}} name="flange3Radius">
                            <InputNumber style={{width: 120}}/>
                        </Form.Item>
                    </div>
                    <div className="f-flex-two-side">
                        <Form.Item label="左外距" labelCol={{span: 9}} name="flange1Pos">
                            <InputNumber style={{width: 120}}/>
                        </Form.Item>
                        <Form.Item label="右内距" labelCol={{span: 9}} name="flange3Pos">
                            <InputNumber style={{width: 120}}/>
                        </Form.Item>
                    </div>
                    <div className="f-flex-two-side">
                        <Form.Item label="左内PCD" labelCol={{span: 9}} name="flange2Radius">
                            <InputNumber style={{width: 120}}/>
                        </Form.Item>
                        <Form.Item label="右外PCD" labelCol={{span: 9}} name="flange4Radius">
                            <InputNumber style={{width: 120}}/>
                        </Form.Item>
                    </div>
                    <div className="f-flex-two-side">
                        <Form.Item label="左内距" labelCol={{span: 9}} name="flange2Pos">
                            <InputNumber style={{width: 120}}/>
                        </Form.Item>
                        <Form.Item label="右外距" labelCol={{span: 9}} name="flange4Pos">
                            <InputNumber style={{width: 120}}/>
                        </Form.Item>
                    </div>
                </Form>
            </div>
            <div>
                <div className="f-flex-row">
                    <RightView rimProps={viewData} hubProps={viewData}/>
                    <BackView rimProps={viewData} hubProps={viewData}/>
                </div>
                <p></p>
                <Descriptions title="辐条" bordered column={2} size="small">
                    <Descriptions.Item label="编法" span={2}><Select></Select></Descriptions.Item>
                    <Descriptions.Item label="左外">{formatNumber(result[0][0])}mm * {formatNumber(result[0][1], 0)}</Descriptions.Item>
                    <Descriptions.Item label="左内">{formatNumber(result[1][0])}mm * {formatNumber(result[1][1], 0)}</Descriptions.Item>
                    <Descriptions.Item label="右外">{formatNumber(result[2][0])}mm * {formatNumber(result[2][1], 0)}</Descriptions.Item>
                    <Descriptions.Item label="右内">{formatNumber(result[3][0])}mm * {formatNumber(result[3][1], 0)}</Descriptions.Item>
                </Descriptions>
            </div>
        </Space>
    )
}