import { Card, Input, Space, Button } from 'antd';
import { useEffect, useRef, useState } from 'react';
import PlanEditor from './planEditor';
import fetch from '@/src/fetch';
import { EditOutlined, CarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
 
import type { IRoadPlan } from '@/src/types/IRoadPlan';

export default function() {

    let navigate = useNavigate();

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

    function onEditPlan(row: IRoadPlan) {
        if (mPlanEditor.current) {
            mPlanEditor.current.showAndEdit(row);
        }
    }

    function onEditRoad(row: IRoadPlan) {
        navigate(`/roadBook/editor?ID=${row.ID}`);
    }

    function renderCards() {
        return cards.map((item: IRoadPlan) => {
            return (
                <Card className='m-road_plan-card' title={item.name}>
                    <p>{item.remark}</p>
                    <p>
                        <Button type="link" onClick={() => onEditPlan(item)} icon={<EditOutlined/>}>
                            修改信息
                        </Button>
                        <Button type="link" onClick={() => onEditRoad(item)} icon={<CarOutlined/>}>
                            修改路线
                        </Button>
                    </p>
                    
                </Card>
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
                <Space size={[8, 16]} wrap>
                    {renderCards()}
                </Space>
            </div>

            { /* @ts-ignore */ }
            <PlanEditor ref={mPlanEditor} onFinish={onQuery}/>
        </div>
    )

}