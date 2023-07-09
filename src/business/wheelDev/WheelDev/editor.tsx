import { Form, InputNumber } from "antd";
import IWheelData from "./IWheelData";
import RightView from "@/src/business/wheelDev/WheelDev/RightView";
import BackView from "@/src/business/wheelDev/WheelDev/BackView";

interface IEditorProps {
    data?: IWheelData
}

export default function(props: IEditorProps) {
    return (
        <div className={'f-flex-row'}>
            <div style={{ width: "300px" }}>
                <p>轮圈</p>
                <Form>
                    <Form.Item label="轮圈直径">
                        <InputNumber/><span>mm</span>
                    </Form.Item>
                </Form>

                <p>花鼓</p>
                <Form>
                    <Form.Item label="左法兰直径">
                        <InputNumber/><span>mm</span>
                    </Form.Item>
                    <Form.Item label="右法兰直径">
                        <InputNumber/><span>mm</span>
                    </Form.Item>
                </Form>
            </div>
            <div className={'f-flex-1'}>
                <RightView rimProps={{ rimHeight: 35, rimRadius: 311 }}/>
                <BackView/>
            </div>
        </div>
    )
}