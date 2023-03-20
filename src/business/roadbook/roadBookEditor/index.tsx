import { Input, Space, Button, message, InputNumber, Modal, Spin, FloatButton } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import qs from 'querystring';
import PlanSelect from '../planSelect';
import DayViewer from './dayViewer';
import fetch from '@/src/fetch';
import DayPlanEditor from './dayEditor';
import _ from 'lodash';
import * as Dayjs from 'dayjs';
import copyToClip from '@/src/utils/common/copy';


/******************************
 * 这里是路书编辑器页面的主入口
 * 
 * 这里的业务太多了，以至于代码是a bull of shit，看PRD吧
 * 
 * 本组件PRD如下：
 * 1）显示路书的名称、简介；
 * 2）显示路书的费用依据；
 * 3）* 显示每日行程的明细数据，如地点、参考时间、天气等；
 * 4）在百度地图上显示总体行程的路径；
 * 5）提供路书基本信息及费用的编辑功能；
 * 6）* 提供每日行程的增加及删除功能，提供编辑入口；
 * 7）TODO: 提供导出md文件功能；
 * 
 * 其中：
 * 3）显示每日行程的明细数据，如地点、参考时间、天气等；
 * 6）提供每日行程的增加及删除功能，提供编辑入口；
 * 由于这两点数据结构较为复杂，组件dayViewer代为实现全部或部分
 * 
 ******************************/



/**
 * dayDb.data使用了mlob作为存储格式，输出的是number[]，这里要把number[]变成jsonObject
 * @param barr 
 * @returns 
 */
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

export default function() {

    let location = useLocation();

    let [roadPlanID, setroadPlanID] = useState<number | null>(null);
    let [editState, setEditState] = useState(false);
    let [spinning, setSpinning] = useState(false);

    let [remark, setRemark] = useState('');
    let [carDayCost, setCarDayCost] = useState<number | null>(0);
    let [fuelLCost, setFuelLCost] = useState<number | null>(0);
    let [fuel100KmCost, setFuel100KmCost] = useState<number | null>(0);
    let [mealDayCost, setMealDayCost] = useState<number | null>(0);
    let [hotelDayCost, setHotelDayCost] = useState<number | null>(0);

    let [planData, setPlanData] = useState([]);

    let mDayPlanEditor = useRef();
    let mBmapDiv = useRef();
    let mLeftArea = useRef();

    let [bmap, setBmap] = useState<any>(null);
    let [loadPlanFlag, setLoadPlanFlag] = useState(false);
    let [showWeathers, setShowWeathers] = useState(true);
    let [personCnt, setPersonCnt] = useState(2);

    async function toggleEditState() {
        if (typeof roadPlanID !== 'number') {
            message.error('操作无法执行，因为未指定路书！');
            return;
        }

        if (!editState) {
            setEditState(true);
        } else {
            let { totalCost } = getCostOfPlan();

            let updateObj = {
                ID: roadPlanID,
                remark,
                data: JSON.stringify({
                    carDayCost,
                    fuelLCost,
                    fuel100KmCost,
                    mealDayCost,
                    hotelDayCost,
                    totalCost,
                    personCnt
                })
            };

            try {
                await fetch.post('/api/roadPlan', updateObj, { params: { ID: roadPlanID } });
                setEditState(false);
            } catch(e) {
                console.error(e);
                message.error(e.message);
            }

            
        }
    }

    /**
     * 加载路书
     * @param planId 
     */
    async function onLoadPlan(planId: number | null) {
        if (typeof planId !== 'number') {
            return;
        }

        try {
            setSpinning(true);

            // 加载路书信息
            let plan: any = await fetch.get('/api/roadPlan', { params: { ID: planId } });
            setRemark(plan.remark);

            let roadData = decodeBuffer(plan.data?.data);
            console.debug('roadData ===> ', roadData)
            setCarDayCost(roadData.carDayCost || 0);
            setFuelLCost(roadData.fuelLCost || 0);
            setFuel100KmCost(roadData.fuel100KmCost || 0);
            setMealDayCost(roadData.mealDayCost || 0);
            setHotelDayCost(roadData.hotelDayCost || 0);
            setPersonCnt(roadData.personCnt || 2);

            // 加载日程信息
            let daysResp = await fetch.get('/api/roadPlan/day/list', { params: { road_id: planId } });
            setPlanData(daysResp.data);
            drawPlanRoute(daysResp.data);
        } finally {
            setSpinning(false);
        }
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

    function editDay(dayData: any, index: number, prev: any, next: any) {
        if (mDayPlanEditor.current) {
            mDayPlanEditor.current.showAndEdit(
                {
                    ID: dayData?.ID,
                    day_index: index,
                    road_id: roadPlanID
                },
                index, 
                prev,
                next
            );
        }
    }

    function deleteDay(index: number) {
        if (!planData[index]) {
            console.error(`第${index}天不存在！`);
            return;
        }

        let planData2 = [...planData];

        let itemData: any = planData[index];
        if (typeof itemData?.ID !== 'number') {
            planData2.splice(index, 1);
            setPlanData(planData2);
        } else {
            Modal.confirm({
                title: '二次确认',
                content: <p>警告！将删除节点，请二次确认！</p>,
                onCancel() {
                    message.warning('请求已取消！');
                },
                async onOk() {
                    try {
                        await fetch.delete('/api/roadPlan/day', { params: { ID: itemData.ID } });
                    } catch(e) {
                        message.error('删除出错，已重新载入数据！');
                        console.error(e);
                    } finally {
                        await onLoadPlan(roadPlanID);
                    }
                }
            })
        }
    }

    /**
     * 渲染所有日程计划
     * @returns 
     */
    function renderDayPlans() {

        let comps = [
            <div className='f-flex-two-side'>
                <h5>日程：</h5>
            </div>
        ];
        let days = planData.map((item, index, arr) => {
            let next = arr[index + 1];
            let prev = arr[index - 1];
            return <DayViewer 
                        day={index + 1} key={index}
                        data={item}
                        isEdit={editState}
                        showWeather={showWeathers}
                        onEdit={() => editDay(item, index, prev, next)}
                        onDelete={() => deleteDay(index)}
                        next={next} prev={prev}
                    />
        });
        comps.push(...days);

        return comps;
    }

    

    function renderCostFrom() {
        if (editState) {
            return [
                <p className='m-plan_editor-more_info is_edit'>
                    <Space>
                        <span>租车费用：</span>
                        <InputNumber addonAfter="￥/天" value={carDayCost} onChange={e => setCarDayCost(e)}/>
                    </Space>
                </p>,
                <p className='m-plan_editor-more_info is_edit'>
                    <Space>
                        <span>燃油费用：</span>
                        <InputNumber addonAfter="￥/L" value={fuelLCost} onChange={e => setFuelLCost(e)}/>
                    </Space>
                    
                </p>,
                <p className='m-plan_editor-more_info is_edit'>
                    <Space>
                        <span>百公里油耗：</span>
                        <InputNumber addonAfter="L/100km" value={fuel100KmCost} onChange={e => setFuel100KmCost(e)}/>
                    </Space>
                    
                </p>,
                <p className='m-plan_editor-more_info is_edit'>
                    <Space>
                        <span>饮食费用：</span>
                        <InputNumber addonAfter="￥/人天" value={mealDayCost} onChange={e => setMealDayCost(e)}/>
                    </Space>
                </p>,
                <p className='m-plan_editor-more_info is_edit'>
                    <Space>
                        <span>住宿费用：</span>
                        <InputNumber addonAfter="￥/天" value={hotelDayCost} onChange={e => setHotelDayCost(e)}/>
                    </Space>
                </p>,
            ];
        } else {
            return [
                <p className='m-plan_editor-more_info'>租车费用：{carDayCost}￥/天</p>,
                <p className='m-plan_editor-more_info'>燃油费用：{fuelLCost}￥/L</p>,
                <p className='m-plan_editor-more_info'>百公里油耗：{fuel100KmCost}L/100km</p>,
                <p className='m-plan_editor-more_info'>饮食费用：{mealDayCost}￥/人天</p>,
                <p className='m-plan_editor-more_info'>住宿费用：{hotelDayCost}￥/天</p>,
            ];
        }
    }

    function renderRemark() {
        if (editState) {
            return <Input.TextArea value={remark} onInput={e => setRemark(e.target.value)}/>;
        } else {
            return <p className='m-plan_editor-remark'>{remark}</p>
        }
    }

    
    /**
     * 计算总行程费用
     * @returns 
     */
    function getCostOfPlan() {
        let dayCnt = planData?.length || 0;

        let planJsons = planData.map(item => {
            return decodeBuffer(item.data?.data);
        });
        console.debug('planJsons ===> ', planJsons);

        let meterCnt = 0;
        if (planJsons instanceof Array) {
            planJsons.forEach(dayPlan => {
                if (dayPlan?.points?.length) {
                    dayPlan.points.forEach((ptInfo: any) => {
                        meterCnt += ptInfo?.dist || 0;
                    })
                }
            });
        }

        let totalCarCost = dayCnt * (carDayCost || 0);
        let totalFuelL = meterCnt * (fuel100KmCost || 0) / 100 / 1000;
        let totalFuelCost = totalFuelL * (fuelLCost || 0);
        let totalHotelCost = dayCnt * (hotelDayCost || 0);
        let totalMealCost = dayCnt * (mealDayCost || 0) * personCnt;
        let totalCost = totalCarCost + totalFuelCost + totalHotelCost + totalMealCost;

        return {
            dayCnt,
            meterCnt,
            totalCarCost,
            totalFuelL,
            totalFuelCost,
            totalHotelCost,
            totalMealCost,
            totalCost
        };
    }

    function renderPlanMoreInfo() {
        let {
            dayCnt,
            meterCnt,
            totalCarCost,
            totalFuelL,
            totalFuelCost,
            totalHotelCost,
            totalMealCost,
            totalCost
        } = getCostOfPlan();

        let personCost = totalCost / personCnt;

        return [
            <h5>费用明细：</h5>,
            <p className='m-plan_editor-more_info'>总时长：{dayCnt} 天</p>,
            <p className='m-plan_editor-more_info'>总里程：{ (meterCnt / 1000).toFixed(2) } km</p>,
            <p className='m-plan_editor-more_info'>预计油耗：{ totalFuelL.toFixed(2) }L { totalFuelCost.toFixed(2) }￥</p>,
            <p className='m-plan_editor-more_info'>租车费用：{totalCarCost.toFixed(2)}￥</p>,
            <p className='m-plan_editor-more_info'>住宿费用：{totalHotelCost.toFixed(2)}￥</p>,
            <p className='m-plan_editor-more_info'>饮食费用：{totalMealCost.toFixed(2)}￥</p>,
            <p className='m-plan_editor-more_info'>合计费用：{totalCost.toFixed(2)}￥</p>,
            <br />,
            <p className='m-plan_editor-more_info'>
                <Space>
                    <label>分摊人数：</label>
                    <InputNumber value={personCnt} onChange={e => setPersonCnt(e)} size="small"/>
                </Space>
            </p>,
            <p className='m-plan_editor-more_info'>人均费用：{personCost.toFixed(2)}￥</p>,
        ]
    }

    function drawPlanRoute(planData) {
        if (!bmap) {
            return;
        }

        bmap.clearOverlays();

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
            let poly = new BMapGL.Polyline(
                path.map((ptObj: any) => new BMapGL.Point(ptObj.lng, ptObj.lat)),
                {
                    strokeColor: (index % 2 === 0) ? 'blue' : 'green',
                    strokeWeight: 4,
                    strokeOpacity: 0.8
                }
            );

            try {
            bmap.addOverlay(poly);
            } catch(e) {
                console.error(e);
            }
        })
    }

    function exportPlanAsMd() {
        let {
            dayCnt,
            meterCnt,
            totalCarCost,
            totalFuelL,
            totalFuelCost,
            totalHotelCost,
            totalMealCost,
            totalCost
        } = getCostOfPlan();

        let personCost = totalCost / personCnt;

        let sections = [
            '# 制表测试',
            '',
            '## 计划详情',
            remark,
            '',
            '#### 费用来源',
            '',
            `租车费用：${carDayCost}￥/天`,
            `燃油费用：${fuelLCost}￥/L`,
            `百公里油耗：${fuel100KmCost}L/100km`,
            `饮食费用：${mealDayCost}￥/人天`,
            `住宿费用：${hotelDayCost}￥/天`,
            '',
            '#### 费用明细：',
            `总时长：${dayCnt} 天`,
            `总里程：${(meterCnt / 1000).toFixed(2)} km`,
            `预计油耗：${totalFuelL.toFixed(2)}L ${totalFuelCost.toFixed(2)}￥`,
            `租车费用：${totalCarCost.toFixed(2)}￥`,
            `住宿费用：${totalHotelCost.toFixed(2)}￥`,
            `饮食费用：${totalMealCost.toFixed(2)}￥`,
            `合计费用：${totalCost.toFixed(2)}￥`,
            '',
            `分摊人数：${personCnt}`,
            `人均费用：${personCost.toFixed(2)}￥`,
            '',
            '## 日程',
            '',
        ];

        function type2disp(type: string) {
            return {
                meal: '用餐',
                position: '途经',
                hotel: '住宿',
                sights: '景点',
            }[type] || '';
        }

        function secondToHHmm(n: number) {
            //@ts-ignore
            let t0 = Dayjs().startOf('day');
            //@ts-ignore
            t0 = t0.add(Dayjs.duration({ seconds: n }));
            return t0.format('HH:mm');
        }
    
        function preferTime2Str(preferTime: any) {
            let ss = null;
            if (preferTime instanceof Array) {
                ss = preferTime.map(n => secondToHHmm(n)).join(' - ');
            }
            return ss;
        }

        if (planData instanceof Array) {
            planData.forEach((item: any, index: number) => {
                let dayPlan = decodeBuffer(item.data?.data);
                if (!dayPlan) {
                    return;
                }

                let oneDayData = [];

                if (item.name) {
                    oneDayData.push(`#### D${index}：${item.name}`);
                } else {
                    oneDayData.push(`#### D${index}`);
                }

                if (item.remark) {
                    oneDayData.push(item.remark);
                }

                oneDayData.push('');

                let { points } = dayPlan;
                if (points?.length) {
                    oneDayData.push(...[
                        '|日程|地点|参考时间|',
                        '|----|:----|----|',
                    ]);

                    points.forEach((item: any, index: number) => {
                        oneDayData.push(
                            `|${type2disp(item.type)}|${item.addr || `导航点${index}`}|${preferTime2Str(item.preferTime)}|`
                        );
                    })
                }

                sections.push(...oneDayData, '');
            });
        }

        let mdText = sections.join('\r\n');
        copyToClip(mdText);
        message.success('数据已复制，请粘贴到印象笔记md文件！');
    }

    function renderBottomArea() {
        if (editState) {
            return (
                <div style={{marginTop: '5px'}}>
                    <Button style={{ width: '100%' }} onClick={() => appendDay()}>添加</Button>
                </div>
            )
        } else {
            return (
                <div style={{marginTop: '5px'}}>
                    <Button style={{ width: '100%' }} onClick={() => exportPlanAsMd()}>导出</Button>
                </div>
            )
        }
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
        <div className='m-plan_editor'>
            <Spin wrapperClassName="f-fit-content" spinning={spinning} size="large">
                <div className="f-fit-height f-flex-two-side">

                    {/* 左侧区域 */}
                    <div className="f-flex-col" style={{ width: 425, height: '100%' }} >
                        <div ref={mLeftArea} className='f-fit-content f-relative f-vertical-scroll'>
                            <Space>
                                <PlanSelect style={{ width: 325 }}
                                    value={roadPlanID} 
                                    onChange={(ID: any) => setroadPlanID(ID)}
                                />
                                <Button type="primary" danger={editState} 
                                        disabled={roadPlanID === null}
                                        onClick={toggleEditState}>
                                    {editState ? '保存' : '编辑'}
                                </Button>
                            </Space>

                            <div>
                                <h3>计划详情：</h3>
                                <section>
                                    { renderRemark() }
                                </section>

                                <section>
                                    <h5>费用来源</h5>
                                    { renderCostFrom() }
                                </section>

                                <section>
                                    {/* 费用明细： */}
                                    { renderPlanMoreInfo() }
                                </section>
                                
                                <section>
                                    { renderDayPlans() }
                                </section>

                                <section>
                                    { renderBottomArea() }
                                </section>
                                
                            </div>

                            {/* 注意该按钮是以window为相对位置 */}
                            <FloatButton.BackTop style={{ left: 520 }} target={() => (mLeftArea.current || window)}/>
                        </div>
                    </div>

                    {/* 右侧区域 */}
                    <div className="f-flex-1 f-relative m-plan_editor-map" style={{margin: '0 0 10px 10px'}}>
                        { /* @ts-ignore */ }
                        <div ref={mBmapDiv}  className="f-fit-content">&nbsp;</div>
                    </div>

                    { /* @ts-ignore */ }
                    <DayPlanEditor ref={mDayPlanEditor} onFinish={e => onLoadPlan(roadPlanID)}/>
                </div>
            </Spin>
        </div>
    );
}