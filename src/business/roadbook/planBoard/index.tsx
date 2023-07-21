import { Card, Input, Space, Button, Modal, message, Descriptions, Tag } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import PlanEditor from './planEditor';
import fetch from '@/src/fetch';
import { EditOutlined, CarOutlined, CloseOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import parseDayDetail from '../roadBookEditor/parseDayDetail';
import PlanTree from './planTree';
 
import type { IRoadPlan } from '@/src/types/IRoadPlan';
import GeoCoder from '@/src/utils/geo/GeoCoder';

export default function() {

    let navigate = useNavigate();

    let [cards, setCards] = useState([]);
    let [queryName, setQueryName] = useState('');
    let [queryProvinces, setQueryProvinces] = useState<React.Key[]>([]);

    let mPlanEditor = PlanEditor.usePlanEditor();

    async function onQuery() {
        let params: { [key: string]: any } = {
            page: 1,
            limit: 100
        }

        if (queryName) {
            params.name = queryName;
        }

        if (queryProvinces.length) {
            // params.provinces = { $json_contains: queryProvinces };
            params.provinces = queryProvinces;
        }

        let { data } = await fetch.get('/api/roadPlan/list', { params });
        setCards(data);
    }

    useEffect(() => {
        onQuery();
    }, []);

    useEffect(() => {
        onQuery();
    }, [queryProvinces, queryName]);

    function onAddPlan() {
        if (mPlanEditor) {
            mPlanEditor.show();
        }
    }

    function onEditPlan(row: IRoadPlan) {
        if (mPlanEditor) {
            mPlanEditor.showAndEdit(row);
        }
    }

    function onEditRoad(row: IRoadPlan) {
        navigate(`/roadBook/editor?ID=${row.ID}`);
    }

    async function deletePlan(plan: IRoadPlan) {
        await fetch.delete('/api/roadPlan', { params: { ID: plan.ID } });
        await onQuery();
    }

    function onProvinceChange(e: React.Key[]) {
        setQueryProvinces(e);
    }

    function renderCards() {
        return cards.map((item: IRoadPlan) => {

            function confirmDelete() {
                Modal.confirm({
                    title: '二次确认！',
                    content: <span>即将删除计划：{item.name}</span>,
                    onOk() {
                        deletePlan(item);
                    }
                })
            }

            const extra = <Space>
                <Button danger type="link" icon={<DeleteOutlined/>} onClick={confirmDelete}>删除</Button>
            </Space>;

            let planDetail: any = {};
            try {
                planDetail = parseDayDetail(item);
                console.debug(planDetail);
            } catch(e: any) {
                console.error(e);
                message.error(e.message);
            }

            let personCnt = planDetail.personCnt || 2;
            let totalCost = planDetail.totalCost || 0;
            let provinces = [<Tag>全国</Tag>];
            if (item.provinces?.length) {
                provinces = item.provinces.map((item: string, index: number) => {
                    let color = index % 2 === 0 ? 'blue' : 'green';
                    return <Tag color={color}>{GeoCoder.findProvinceOfCode(item)}</Tag>
                })
            }

            return (
                <Card className='m-road_plan-card' title={item.name} extra={extra}>
                    <p>{item.remark}</p>
                    
                    <Descriptions size={'small'} column={1}>
                        <Descriptions.Item label="省份">{provinces}</Descriptions.Item>
                        <Descriptions.Item label="人均">{`${(totalCost / personCnt).toFixed(2)}￥`}</Descriptions.Item>
                    </Descriptions>

                    <Space>
                        <Button size='small' onClick={() => onEditPlan(item)} icon={<EditOutlined/>}>
                            修改信息
                        </Button>
                        <Button size="small" type="primary" onClick={() => onEditRoad(item)} icon={<CarOutlined/>}>
                            查看路线
                        </Button>
                    </Space>
                    
                </Card>
            )
        })
    }

    return (
        <div className="f-fit-height f-flex-row">
            <PlanTree onChange={onProvinceChange}/>
            <div className="f-flex-1 f-fit-height f-flex-col">
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
                <PlanEditor helper={mPlanEditor} onFinish={onQuery}/>
            </div>
        </div>
    )

}