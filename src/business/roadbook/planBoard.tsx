import { Card, Input, Space, Button } from 'antd';
import { useState } from 'react';

export default function() {

    let [cards, setCards] = useState([]);
    let [queryName, setQueryName] = useState('');

    return (
        <div className="f-fit-height f-flex-col">
            <div className='f-flex-two-side'>
                <Space>
                    <label>路书名称：</label>
                    { /* @ts-ignore */ }
                    <Input value={queryName} onInput={e => setQueryName(e.target?.value)}/>
                    <Button type='primary'>查询</Button>
                </Space>
                <Space>
                    <Button>添加</Button>
                </Space>
            </div>
            <div className="f-flex-1" style={{ margin: '12px 0' }}>

            </div>
        </div>
    )

}