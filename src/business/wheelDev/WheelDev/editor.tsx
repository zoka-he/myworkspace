import { Form, InputNumber } from "antd";
import IWheelData from "./IWheelData";
import Preview from './preview';

interface IEditorProps {
    data?: IWheelData
}

export default function(props: IEditorProps) {
    return (
        <div>
            <div>
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
            <div>
                <Preview.RightView/>
                <Preview.BackView/>
            </div>
        </div>
    )
}