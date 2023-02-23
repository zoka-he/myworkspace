import { Card, Input, Space, Button } from 'antd';
import { useEffect, useRef, useState } from 'react';
import PlanEditor from './planEditor';
import fetch from '@/src/fetch';

export default function() {

    let [cards, setCards] = useState([]);
    let [queryName, setQueryName] = useState('');

    let mPlanEditor = useRef<PlanEditor>();

    async function onQuery() {
        let params = {
            page: 1,
            limit: 100
        }
        let { data, count } = await fetch.get('/api/roadPlan/list', { params });
        setCards(data);
    }

    useEffect(() => {
        onQuery();
    }, []);

    function onAddPlan() {
        if (mPlanEditor.current) {
            mPlanEditor.current.show();
        }
    }

    function renderCards() {
        return cards.map(item => {
            return (
                <Card></Card>
            )
        })
    }

    return (
        <div className="f-fit-height f-flex-col">
            <div className='f-flex-two-side'>
                <Space>
                    <label>路书名称：</label>
                    { /* @ts-ignore */ }
                    <Input value={queryName} onInput={e => setQueryName(e.target?.value)}/>
                    <Button type='primary' onClick={onQuery}>查询</Button>
                </Space>
                <Space>
                    <Button onClick={onAddPlan}>添加</Button>
                </Space>
            </div>
            <div className="f-flex-1" style={{ margin: '12px 0' }}>
                {renderCards()}
            </div>

            { /* @ts-ignore */ }
            <PlanEditor ref={mPlanEditor} onFinish={onQuery}/>
        </div>
    )

}