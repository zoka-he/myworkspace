import {Table, Radio, Space} from 'antd';
import Editor from '../../WheelDev';
import { useState } from 'react';


export default function AccountManage() {
    let [wheelFB, setWheelFB] = useState('front');

    return (
        <div>
            <div>
                <Space>
                    <Radio.Group value={wheelFB} onChange={e => setWheelFB(e?.target?.value)}>
                        <Radio value={'front'}>前轮</Radio>
                        <Radio value={'back'}>后轮</Radio>
                    </Radio.Group>
                </Space>
                <br />
            </div>
            <Editor readonly={true}/>
        </div>
    )
}