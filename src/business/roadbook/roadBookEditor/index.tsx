import { Card, Input, Space, Button, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import qs from 'querystring';
import PlanSelect from '../planSelect';
import DayViewer from './dayViewer';
import fetch from '@/src/fetch';
import DayPlanEditor from './dayEditor';

export default function() {

    let navigate = useNavigate();
    let location = useLocation();

    let [rowPlanID, setRowPlanID] = useState<number | null>(null);
    let [editState, setEditState] = useState(false);

    let [remark, setRemark] = useState('');
    let [planData, setPlanData] = useState([]);

    let mDayPlanEditor = useRef();

    let sstr = location.search;
    if (sstr.startsWith('?')) {
        sstr = sstr.substring(1);
    }
    let sobj = qs.parse(sstr);
    console.debug('sobj', sobj);

    function toggleEditState() {
        setEditState(!editState);
    }

    async function onLoadPlan(planId: number) {
        let plan: any = await fetch.get('/api/roadPlan', { params: { ID: planId } });

        setRemark(plan.remark);
        try {
            let planData2 = JSON.parse(plan.data);
            if (planData2 instanceof Array) {
                setPlanData(planData2);
            } else {
                setPlanData([]);
            }
        } catch(e) {
            setPlanData([]);
        }

        console.debug('plan', plan);
    }

    function appendDay(index?: number) {
        let planData2 = [...planData];
        if (index === undefined) {
            planData2.push({});
            setPlanData(planData2);
        } else {
            planData2.splice(index, 0, {});
            setPlanData(planData2);
        }
    }

    function prependDay(index: number) {
        if (index > 0) {
            index -= 1;
        }
        appendDay(index);
    }

    function editDay(dayData: any) {
        if (mDayPlanEditor.current) {
            mDayPlanEditor.current.showAndEdit(dayData);
        }
    }

    function renderDayPlans() {

        if (planData.length === 0) {
            return <Button disabled={!editState} style={{ width: '100%' }}
                           onClick={() => appendDay()}>添加</Button>
        } else {
            return planData.map((item, index) => {
                return <DayViewer 
                            day={index + 1} key={index}
                            onAppend={() => appendDay(index)}
                            onPrepend={() => prependDay(index)}
                            onEdit={() => editDay(item)}
                       />
            })
        }
    }
    
    useEffect(() => {
        if (rowPlanID !== null)
            onLoadPlan(rowPlanID);
    }, [rowPlanID])

    return (
        <div className="f-fit-height f-flex-two-side">
            <div style={{ minWidth: 400, height: '100%', overflow: 'auto' }} className="f-flex-col">
                <Space>
                    <PlanSelect style={{ width: 260 }}
                        value={rowPlanID} 
                        onChange={(ID: any) => setRowPlanID(ID)}
                    />
                    <Button type="primary" danger={editState} 
                            disabled={rowPlanID === null}
                            onClick={toggleEditState}>
                        {editState ? '编辑中' : '编辑'}
                    </Button>
                    <Button disabled={!editState}>保存</Button>
                </Space>
                <div>
                    <h5>备注：</h5>
                    { /* @ts-ignore */ }
                    <Input.TextArea disabled={!editState} value={remark} onInput={e => setRemark(e.target.value)}/>
                    <h5>日程：</h5>
                    { renderDayPlans() }
                </div>
            </div>
            <div className="f-flex-1">

            </div>

            { /* @ts-ignore */ }
            <DayPlanEditor ref={mDayPlanEditor}/>
        </div>
    );
}