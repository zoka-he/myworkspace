import {Table, Radio, Space} from 'antd';
import Editor from '../../WheelDev';


const { Column } = Table;

export default function AccountManage() {
    return (
        <div>
            <Space>
                <Radio.Group>
                    <Radio>前轮</Radio>
                    <Radio>后轮</Radio>
                </Radio.Group>
            </Space>
            <Editor readonly={true}/>
        </div>
    )
}