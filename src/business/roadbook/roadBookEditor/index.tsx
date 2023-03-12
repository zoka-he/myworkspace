import { Card, Input, Space, Button, Select, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import qs from 'querystring';
import PlanSelect from '../planSelect';
import DayViewer from './dayViewer';
import fetch from '@/src/fetch';
import DayPlanEditor from './dayEditor';
import _ from 'lodash';

export default function() {

    let location = useLocation();

    let [roadPlanID, setroadPlanID] = useState<number | null>(null);
    let [editState, setEditState] = useState(false);

    let [remark, setRemark] = useState('');
    let [planData, setPlanData] = useState([]);

    let mDayPlanEditor = useRef();
    let mBmapDiv = useRef();

    let [bmap, setBmap] = useState<any>(null);
    let [loadPlanFlag, setLoadPlanFlag] = useState(false);

    function toggleEditState() {
        setEditState(!editState);
    }

    /**
     * 加载路书
     * @param planId 
     */
    async function onLoadPlan(planId: number) {

        // 加载路书信息
        let plan: any = await fetch.get('/api/roadPlan', { params: { ID: planId } });
        setRemark(plan.remark);

        // 加载日程信息
        let daysResp = await fetch.get('/api/roadPlan/day/list', { params: { road_id: planId } });
        setPlanData(daysResp.data);
        drawPlanRoute(daysResp.data);

        console.debug('plan', plan);
        console.debug('days', daysResp.data);
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

    function editDay(dayData: any, index: number) {
        if (mDayPlanEditor.current) {
            mDayPlanEditor.current.showAndEdit({
                ID: dayData?.ID,
                day_index: index,
                road_id: roadPlanID
            });
        }
    }

    function renderDayPlans() {

        let comps = [];
        let days = planData.map((item, index) => {
            return <DayViewer 
                        day={index + 1} key={index}
                        data={item}
                        onAppend={() => appendDay(index)}
                        onPrepend={() => prependDay(index)}
                        onEdit={() => editDay(item, index)}
                    />
        });
        comps.push(...days);
        comps.push(<div style={{marginTop: '5px'}}>
            <Button disabled={!editState} style={{ width: '100%' }} onClick={() => appendDay()}>添加</Button>
        </div>);
        return comps;
    }

    function renderRemark() {
        if (editState) {
            return <Input.TextArea value={remark} onInput={e => setRemark(e.target.value)}/>;
        } else {
            return <p>{remark}</p>
        }
    }

    function drawPlanRoute(planData) {
        if (!bmap) {
            return;
        }

        bmap.clearOverlays();

        console.debug('planData =>', planData);
        function decodeBuffer(barr?: number[]) {
            if (!barr) {
                return {};
            }

            let decoder = new TextDecoder('utf-8');
            let json = decoder.decode(new Uint8Array(barr));
            try {
                return JSON.parse(json);
            } catch(e: any) {
                console.error(e);
                message.error(e.message);
                return {};
            }
        }

        let viewportPoints: any[] = [];
        let keyPoints: any[] = [];
        let dayRoutes: any[] = [];

        if (planData instanceof Array) {
            planData.forEach(item => {
                let dayPlan = decodeBuffer(item.data?.data);
                if (dayPlan) {
                    let { points, routes } = dayPlan;

                    if (points?.length) {
                        viewportPoints.push(
                            new BMapGL.Point(points[0].lng, points[0].lat),
                            new BMapGL.Point(points[points.length - 1].lng, points[points.length - 1].lat)
                        )

                        keyPoints.push(new BMapGL.Point(points[points.length - 1].lng, points[points.length - 1].lat));
                    }

                    if (routes) {
                        dayRoutes.push(_.concat(...routes.map(item => item.path)));
                    }
                }
            });
        }

        console.debug('keypoints', keyPoints, 'dayRoutes', dayRoutes);

        bmap.setViewport(viewportPoints);
        keyPoints.forEach((pt, index) => {
            let marker = new BMapGL.Marker(pt);

            bmap.addOverlay(marker);

            // 创建文本标注对象
            var label = new BMapGL.Label(
                `D${index+1}`, 
                {
                    position: pt, // 指定文本标注所在的地理位置
                    offset: new BMapGL.Size(30, -30) // 设置文本偏移量
                }
            );

            label.setStyle({
                color: 'blue',
                borderRadius: '4px',
                borderColor: '#ccc',
                padding: '5px',
                fontSize: '10px',
                height: '30px',
                lineHeight: '18px',
                fontFamily: '微软雅黑'
            });

            bmap.addOverlay(label);
        })

        dayRoutes.forEach((path, index) => {
            let strokeColor = (index % 2 === 0) ? 'blue' : 'green';

            let poly = new BMapGL.Polyline(
                path.map((ptObj: any) => new BMapGL.Point(ptObj.lng, ptObj.lat)),
                {
                    strokeColor,
                    strokeWeight: 4,
                    strokeOpacity: 0.8
                }
            );

            bmap.addOverlay(poly);
        })
    }

    useEffect(() => {
        if (roadPlanID !== null) {
            if (!bmap) {
                setLoadPlanFlag(true);
            } else {
                onLoadPlan(roadPlanID);
            }
        }
    }, [roadPlanID]);

    useEffect(() => {
        if (!bmap) {
            let div = mBmapDiv.current;
            console.debug('bmap容器已就绪！', div);

            let map = new BMapGL.Map(div);
            map.enableScrollWheelZoom();
            map.disableDoubleClickZoom();

            // 设置初始中心点
            let point = new BMapGL.Point(116.404, 39.915);
            map.centerAndZoom(point, 15);

            setBmap(map);
        }

        if (loadPlanFlag && typeof roadPlanID === 'number') {
            onLoadPlan(roadPlanID);
        }
    }, [mBmapDiv]);


    useEffect(() => {
        let sstr = location.search;
        if (sstr.startsWith('?')) {
            sstr = sstr.substring(1);
        }
        let { ID } = qs.parse(sstr);
        if (ID) {
            setroadPlanID(_.toNumber(ID));
        }

        return function onDestroy() {
            console.debug('组件销毁!');
            if (bmap) {
                bmap.destroy();
            }
        }

    }, []);
    


    return (
        <div className="f-fit-height f-flex-two-side">
            <div style={{ minWidth: 400, height: '100%', overflow: 'auto' }} className="f-flex-col">
                <Space>
                    <PlanSelect style={{ width: 325 }}
                        value={roadPlanID} 
                        onChange={(ID: any) => setroadPlanID(ID)}
                    />
                    <Button type="primary" danger={editState} 
                            disabled={roadPlanID === null}
                            onClick={toggleEditState}>
                        {editState ? '编辑中' : '编辑'}
                    </Button>
                </Space>
                <div>
                    <h3>计划详情：</h3>
                    {renderRemark()}
                    <h5>日程：</h5>
                    { renderDayPlans() }
                </div>
            </div>
            <div className="f-flex-1 f-relative" style={{marginLeft: '10px'}}>
                { /* @ts-ignore */ }
                <div ref={mBmapDiv}  className="f-fit-content">&nbsp;</div>
            </div>

            { /* @ts-ignore */ }
            <DayPlanEditor ref={mDayPlanEditor} onFinish={e => onLoadPlan(roadPlanID)}/>
        </div>
    );
}