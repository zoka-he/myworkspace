import React, { useEffect, useState } from "react";
import { Modal, Input, Button, message, AutoComplete, Select, Space, TimePicker } from "antd";
import _ from 'lodash';
import { ExclamationCircleFilled, PlusOutlined } from '@ant-design/icons';
import confirm from "antd/es/modal/confirm";
import NodeEditor from "./nodeEditor";
import uuid from "@/src/utils/common/uuid";
import * as Dayjs from 'dayjs';
import fetch from '@/src/fetch';


/**
 * 地理位置检索控件
 * @param props 
 * @returns 
 */
function GeoSearch(props) {
    let [compOpts, setCompOpts] = useState([]);
    let [pois, setPois] = useState([]);

    /**
     * 查询地理位置
     */
    const onSearch = _.debounce(function(s: string) {
        if (!s) {
            return;
        }

        if (!props.map) {
            console.debug('map is not defined!');
            return;
        }

        let map = props.map;
        if (typeof map === 'function') {
            map = map();
        }

        var sOpts = {
            onSearchComplete: function(results){
                // 判断状态是否正确
                if (local.getStatus() == BMAP_STATUS_SUCCESS){
                    let _pois = results._pois;
                    let poiOpts = _pois.map((poi, index) => {
                        return {
                            label: poi.address,
                            value: index
                        }
                    });
                    
                    setCompOpts(poiOpts);
                    setPois(_pois);
                } else {
                    message.error('地理搜索失败', local.getStatus());
                }
            }
        };

        console.debug('搜索', s);

        var local = new BMapGL.LocalSearch(map, sOpts);
        local.search(s);
    }, 500);

    /**
     * 下拉列表选中
     * @param val 
     * @returns 
     */
    function onSelect(val) {
        if (!props.map) {
            console.debug('map is not defined!');
            return;
        }

        let map = props.map;
        if (typeof map === 'function') {
            map = map();
        }

        // console.debug('select poi', val, pois[_.toNumber(val)]);
        let poi = pois[_.toNumber(val)];
        if (poi && typeof props.onAddress === 'function') {
            props.onAddress(poi.point);
        }
    }

    return <Select style={{ width: '450px' }}
                    options={compOpts} filterOption={false} 
                    showSearch onSearch={onSearch} onSelect={onSelect}></Select>
}

interface IDayPlanEditorProps {
    onFinish?: Function,
}

interface IDayPlanEditorState {
    modalOpen: boolean,
    loading: boolean,
    dayPlanDetail: Array<any>,
    posText: string,
    isLocatingNode: boolean,
    locateNodeIndex: number | null,
    shouldCalculate: boolean,
    startTime: Dayjs | null,
    remark: string,
    roadDb?: any,
    dayDb?: any
}

class DayPlanEditor extends React.Component<IDayPlanEditorProps, IDayPlanEditorState> {

    private oldData: any;
    private mMapContainer: HTMLDivElement | null = null;
    private bmap: any;
    private mNodeComps: Array<NodeEditor | null>;
    private mk_nodePoints: any[];
    private mk_planRoutes: any[];
    private o_oplanRoutes: any[];
    private b_willUpdateBmapPoints: boolean;
    private o_daydb: any;
    private b_willParseAndFixData: boolean;
    private o_openPayload: any;

    constructor(props: IDayPlanEditorProps) {
        super(props);

        this.state = {
            modalOpen: false,
            loading: false,
            posText: '',
            dayPlanDetail: [],
            isLocatingNode: false,
            locateNodeIndex: null,
            shouldCalculate: false,
            startTime: null,
            remark: '',
            roadDb: undefined,
            dayDb: undefined
        }

        this.mNodeComps = [];
        this.mk_nodePoints = [];
        this.mk_planRoutes = [];
        this.o_oplanRoutes = [];
        this.b_willUpdateBmapPoints = false;
        this.b_willParseAndFixData = false;
    }

    show() {
        this.setState({
            modalOpen: true
        });
    }

    loadDefaultData() {
        // 默认每天出发时间为7天
        let startTime = Dayjs().startOf('day').add(7, 'hour');

        // 默认添加一个节点
        let dayPlanDetail = [{ uuid: uuid() }];

        this.setState({
            startTime,
            dayPlanDetail
        })
    }

    /**
     * 从数据库装载日程
     * @param dayDb 
     */
    loadDbData(dayDb: any) {
        console.debug('loadDbData', dayDb);
        let up_state: any = {};

        // 设置描述
        up_state.remark = dayDb.remark;

        let detailData = dayDb.data;
        let detailJson = '';
        if (detailData.type === 'Buffer') {
            let nums: Array<number> = detailData.data;
            let decoder = new TextDecoder('utf-8');
            detailJson = decoder.decode(new Uint8Array(nums));
        }

        let detail: any = {};
        if (detailJson) {
            try {
                detail = JSON.parse(detailJson);
            } catch(e) {
                console.error(e);
                message.error(e.message);
            }
        }

        console.debug('dayDetail ========>> ', detail);

        function secondToDayjs(n: number) {
            let t0 = Dayjs().startOf('day');
            return t0.add(Dayjs.duration({ seconds: n }));
        }


        // 设置起始时间（如果有）
        if (detail.points?.length) {
            let pt0 = detail.points[0];
            if (pt0.preferTime?.length) {
                let startSeconds = pt0.preferTime[0];
                up_state.startTime = secondToDayjs(startSeconds);
            }
        }

        // 设置点位（如果有）
        if (detail.points?.length) {
            up_state.dayPlanDetail = detail.points;
            this.drawPoints(detail.points);
            this.adjustPoints(detail.points);
        }

        // 设置路径（如果有）
        if (detail.routes?.length) {
            // 画了会自动保存到 this.o_oplanRoutes
            this.drawPlans(detail.routes);
        }
        
        this.setState(up_state)
    }

    async parseAndFixData(data: any) {
        if (!this.bmap) {
            console.debug('parseAndFixData => no bmap retry:', data);

            this.b_willParseAndFixData = true;
            this.o_openPayload = data;
            return;
        }

        console.debug('parseAndFixData', data);

        let road_id = data.road_id;
        let day_id = data.ID;
        let day_index = data.day_index;

        let o_roadDb = await fetch.get('/api/roadPlan', { params: { ID: road_id } });
        this.setState({ roadDb: o_roadDb });

        let o_daydb: any = {};
        if (day_id) {
            o_daydb = await fetch.get('/api/roadPlan/day', { params: { ID: day_id } });
        }
        if (!o_daydb) {
            o_daydb = {};
        }

        // 设置强制项
        o_daydb.road_id = road_id;
        o_daydb.day_index = day_index;
        this.setState({ dayDb: o_daydb });

        if (!day_id) {
            this.loadDefaultData();
        } else {
            this.loadDbData(o_daydb);
        }
    }

    showAndEdit(data: any) {
        this.setState({
            modalOpen: true,
            dayPlanDetail: []
        });

        this.clearMap();

        this.parseAndFixData(data);
    }

    /**
     * 打开，并自动附带上任务ID
     * @param task
     */
    showWithTask(task: any) {
        let { ID } = task;
        this.setState({
            modalOpen: true
        });

        this.oldData = { task_id: ID };
    }


    hide() {
        this.setState({
            modalOpen: false
        });
    }

    /**
     * 保存完毕的回调
     * @param data 
     */
    async onFinish(data: any) {
        this.hide();

        let cb = this.props.onFinish;
        if (cb) {
            cb(data);
        }
    }

    onCancel() {
        this.hide();
    }

    /**
     * 增加节点
     */
    appendNode() {
        let detailArr = [...this.state.dayPlanDetail];
        detailArr.push({ uuid: uuid() });

        this.setState({
            dayPlanDetail: detailArr,
            isLocatingNode: false, // 强制关闭节点编辑模式，避免误触发
            locateNodeIndex: null
        })
    }

    /**
     * 删除节点
     * @param index 
     */
    deleteNode(index: number) {
        
        const execDel = () => {
            let detailArr = [...this.state.dayPlanDetail];
            if (index < 0 || index >= detailArr.length) {
                console.error('数组下标超限');
                return;
            }
    
            this.willUpdateMapPoints();

            detailArr.splice(index, 1);
            this.setState({
                dayPlanDetail: detailArr,
                isLocatingNode: false, // 强制关闭节点编辑模式，避免误触发
                locateNodeIndex: null
            });
    
            
        }

        confirm({
            title: '删除确认',
            icon: <ExclamationCircleFilled />,
            content: '警告！将删除节点，请二次确认！',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk() {
                execDel();
            },
            onCancel() {
                console.log('Cancel');
            },
        });
    }

    /**
     * 前移节点
     * @param index 
     */
    moveUpNode(index: number) {
        let detailArr = [...this.state.dayPlanDetail];
        let itemWillMove = detailArr[index]; 
        detailArr.splice(index, 1);
        detailArr.splice(index - 1, 0, itemWillMove);
        this.setState({
            dayPlanDetail: detailArr,
            isLocatingNode: false, // 强制关闭节点编辑模式，避免误触发
            locateNodeIndex: null
        });
    }

    /**
     * 后移节点
     * @param index 
     */
    moveDownNode(index: number) {
        let detailArr = [...this.state.dayPlanDetail];
        let itemWillMove = detailArr[index]; 
        detailArr.splice(index, 1);
        detailArr.splice(index + 1, 0, itemWillMove);
        this.setState({
            dayPlanDetail: detailArr,
            isLocatingNode: false, // 强制关闭节点编辑模式，避免误触发
            locateNodeIndex: null
        });
    }

    /**
     * 节点组件请求设置定位
     * @param index 
     */
    nodeRequestLocate(index: number) {
        if (!this.state.isLocatingNode) {
            this.setState({
                isLocatingNode: true,
                locateNodeIndex: index
            })
        } else {
            this.setState({
                isLocatingNode: false,
                locateNodeIndex: null
            })
        }
    }

    /**
     * 更新节点ref列表
     * @param comp 
     * @param index 
     */
    updateNodeComps(comp, index) {
        this.mNodeComps[index] = comp;
        console.debug(this.mNodeComps);
    }

    /**
     * 渲染编辑列表
     * @returns {JSX.Element}
     */
    renderDetail() {
        this.mNodeComps = [];
        let taskContext = this.state.dayPlanDetail.map((item, index, arr) => {
            return <NodeEditor  ref={comps => this.updateNodeComps(comps, index)} index={index} key={item.uuid} 
                                isLocating={this.state.isLocatingNode}
                                locatingIndex={this.state.locateNodeIndex}
                                totalCount={arr.length} initData={item}
                                moveUpNode={() => this.moveUpNode(index)}
                                moveDownNode={() => this.moveDownNode(index)}
                                deleteNode={() => this.deleteNode(index)}
                                requestLocate={() => this.nodeRequestLocate(index)}
                                locateChange={() => this.updateMapPoints()}
                                indexChange={() => this.willUpdateMapPoints()}
                    />
        });

        return (
            <div>
                {taskContext}
            </div>
        );
    }

    /**
     * 获取地图某一点位置
     * @param point 
     * @returns 
     */
    getPointAddress(point: any) {
        return new Promise(cb => {
            let myGeo = new BMapGL.Geocoder();     

            // 根据坐标得到地址描述    
            myGeo.getLocation(point, function(rs: any) {      
                let addComp = rs.addressComponents;    
                cb({
                    longAddr: [ addComp.city, addComp.district, addComp.street, addComp.streetNumber ].join(''),
                    shortAddr: [ addComp.city, addComp.district ].join('')
                });      
            });
        });
    }

    /**
     * 更新地图点位
     * @param pts 
     */
    onGeoSearchAddress(...pts) {
        if (pts.length === 0) {
            return;
        }

        if (pts.length === 1) {
            this.bmap.centerAndZoom(pts[0], 15);
            return;
        }
        
    }

    /**
     * 在地图上画点
     * @param ptList 
     */
    drawPoints(ptList: any[]) {
        ptList.forEach(pInfo => {
            let pt = new BMapGL.Point(pInfo.lng, pInfo.lat);
            let comp = pInfo.comp;

            let marker = new BMapGL.Marker(pt);
            this.bmap.addOverlay(marker);
            this.mk_nodePoints.push(marker);

            // 创建文本标注对象
            var label = new BMapGL.Label(pInfo.addr, {
                position: pt, // 指定文本标注所在的地理位置
                offset: new BMapGL.Size(30, -30) // 设置文本偏移量
            });
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

            this.bmap.addOverlay(label);
            this.mk_nodePoints.push(label);


            // 给节点增加拖拽功能，拖拽后，需要同步更改标签位置及comp数据
            if (comp) {
                marker.addEventListener('dragging', e => {
                    // console.debug('dragging', e.point?.lng, e.point?.lat);
                    label.setPosition(e.point);
                });
                marker.addEventListener('dragend', e => {
                    // console.debug('dragend', e.point?.lng, e.point?.lat);
                    comp.acceptLocation({
                        lat: e.point.lat,
                        lng: e.point.lng,
                    });
                });
                marker.enableDragging();
            }
        });
    }

    adjustPoints(ptList: any[]) {
        let points: any = [];
        ptList.forEach(pInfo => {
            if (pInfo.lng && pInfo.lat) {
                let pt = new BMapGL.Point(pInfo.lng, pInfo.lat);
                points.push(pt);
            }
        });

        if (this.bmap) {
            this.bmap.setViewport(points);
        }
    }

    /**
     * 下一次渲染时更新地图上所有点位
     */
    willUpdateMapPoints() {
        this.b_willUpdateBmapPoints = true;
    }

    // 更新地图上所有点位
    updateMapPoints() {
        // 结束打标状态
        this.setState({ 
            shouldCalculate: true,
            isLocatingNode: false,
            locateNodeIndex: null
        });

        // 首先移除所有的点位
        this.mk_nodePoints.forEach(item => {
            this.bmap.removeOverlay(item);
        });
        this.mk_nodePoints = [];

        let ptList: any[] = [];
        this.mNodeComps.forEach((comp, index) => {

            if (!comp?.state) {
                return;
            }

            let { lng, lat, addr } = comp?.state;
            if (!lng || !lat) {
                return;
            }

            ptList.push({
                lng,
                lat,
                addr: addr || `${index}号节点`,
                // comp    // 关联的comp组件
            })
        });

        this.drawPoints(ptList);
    }

    /**
     * 地图点击动作
     * @param e 
     */
    async onClickMap(e: any) {
        let pt = e.latlng;
        let addr = await this.getPointAddress(pt);

        // 判断是否工作在节点打标状态，如果是，则点击的时候创建Marker
        if (this.state.isLocatingNode && this.state.locateNodeIndex !== null) {
            let nodeComp = this.mNodeComps[this.state.locateNodeIndex];
            if (!nodeComp) {
                message.error('找不到对应节点');
                this.setState({
                    isLocatingNode: false,
                    locateNodeIndex: null
                });
                return;
            }

            // 设置节点地址
            nodeComp.acceptLocation({
                lat: pt.lat,
                lng: pt.lng,
            });

        } else {
            let msg = [
                pt.lng, 
                pt.lat,
                addr.longAddr
            ]
    
    
            this.setState({
                posText: msg.join('，')
            });
        }

    }

    /**
     * 初始化百度地图
     * @param comp div节点
     * @returns 无返回
     */
    onMapContainerRef(comp: HTMLDivElement | null) {
        this.mMapContainer = comp;
        console.debug('mMapContainer', this.mMapContainer);

        if (!comp) {
            return;
        }

        if (!this.bmap) {
            let map = new BMapGL.Map(comp);
            map.enableScrollWheelZoom();
            map.disableDoubleClickZoom();

            // 设置初始中心点
            let point = new BMapGL.Point(116.404, 39.915);
            map.centerAndZoom(point, 15);

            // 添加点击事件
            map.addEventListener('click', e => this.onClickMap(e));

            this.bmap = map;
        }

        if (this.b_willParseAndFixData) {
            this.b_willParseAndFixData = false;
            this.parseAndFixData(this.o_openPayload);
        }
        
    }

    /**
     * 更新路径规划
     * @returns 
     */
    async calculatePlan() {
        let pts: any[] = [];
        
        // 从节点组件获取数据
        this.mNodeComps.forEach(comp => {
            if (!comp?.state?.lng || !comp?.state?.lat)
                return;

            pts.push(new BMapGL.Point(comp.state.lng, comp.state.lat));
        });

        // 少于2个节点无法计算
        if (pts.length < 1) {
            message.error('可使用的点位少于2个，请编辑后再进行计算！');
            return;
        }

        // 路径点两两组成分段
        let routes = pts.map((item, index, arr) => {
            if (index === 0) {
                return [];
            } else {
                return [arr[index - 1], item];
            }
        });

        console.debug('routes', routes);

        // 从百度地图获取路径规划数据
        let routesPlans = await Promise.all(routes.map((item, index) => {
            if (item.length < 2) {
                return Promise.resolve(null);
            } else {
                return new Promise((cb) => {
                    let plan: any = null;
        
                    let transit = new BMapGL.DrivingRoute(
                        this.bmap, 
                        {
                            onSearchComplete(results: any) {
                                if (transit.getStatus() === BMAP_STATUS_SUCCESS){
                                    plan = results.getPlan(0);   
                                } 
    
                                cb(plan);
                            },
                        }
                    )

                    transit.search(item[0], item[1]);
                })
            }
        }));

        console.info('routesPlan', routesPlans);

        // 从百度地图数据拆解出关键节点数据及路径数据
        let routesDatas = routesPlans.map(item => {
            if (item === null) {
                return {
                    path: [],
                    distance: 0,
                    duration: 0
                }
            } else {
                return {
                    path: item.getRoute(0).getPath(),
                    distance: item.getDistance(false),
                    duration: item.getDuration(false)
                }
            }
        });

        console.info('routesDatas', JSON.stringify(routesDatas));

        // 划线
        this.drawPlans(routesDatas);

        // 修改各组件的距离、时间
        this.modifyDistanceAndDurations(routesDatas);

        this.setState({
            shouldCalculate: false
        })
    }

    /**
     * 修改节点的时间数值
     * @param routeDatas 
     */
    modifyDistanceAndDurations(routeDatas: any[]) {
        if (!this.state.startTime) {
            message.error('未设置起始时间，规划无法执行');
            return;
        }

        let dayTimer = this.state.startTime.clone();

        routeDatas.forEach((data, index) => {
            let comp = this.mNodeComps[index];
            if (comp) {
                let stayDura = comp.getStayDuraSecond();
                console.debug('stayDura', stayDura)

                dayTimer = dayTimer.add(data.duration, 'second');
                let preferT0 = dayTimer.clone();

                dayTimer = dayTimer.add(stayDura);
                let preferT1 = dayTimer.clone();

                comp.acceptDistAndDura(data.distance, data.duration, [ preferT0, preferT1 ]);
            }
        })
    }


    /**
     * 在地图上画出路线
     * @param routeDatas 
     */
    drawPlans(routeDatas: any[]) {
        this.mk_planRoutes.forEach(item => {
            this.bmap.removeOverlay(item);
        });
        this.mk_planRoutes = [];

        this.o_oplanRoutes = routeDatas;
        routeDatas.forEach((data, index) => {
            let path = data.path;
            if (path.length === 0) {
                return;
            }

            try {
                let strokeColor = (index % 2 === 0) ? 'blue' : 'green';
                let poly = new BMapGL.Polyline(
                    path.map((ptObj: any) => new BMapGL.Point(ptObj.lng, ptObj.lat)),
                    {
                        strokeColor,
                        strokeWeight: 4,
                        strokeOpacity: 0.8
                    }
                );

                this.bmap.addOverlay(poly);
                this.mk_planRoutes.push(poly);
            } catch(e) {
                console.error(e);
            }
        })
    }

    clearMap() {
        this.mk_planRoutes.forEach(item => {
            this.bmap.removeOverlay(item);
        });
        this.mk_planRoutes = [];

        this.mk_nodePoints.forEach(item => {
            this.bmap.removeOverlay(item);
        });
        this.mk_nodePoints = [];
    }

    /**
     * 渲染地图抬头提示
     * @returns 
     */
    renderMapHint() {
        if (this.state.isLocatingNode) {
            return <p className="f-red">{this.state.locateNodeIndex}号节点正在更改定位，请点击地图！如需修改节点名称，请手动清除原有名称！</p>;
        }

        if (this.state.shouldCalculate) {
            return <p className="f-red">节点状态发生变更，请重新计算路径！</p>
        }

        return <p>当前位置：{this.state.posText}</p>;
    }

    renderEditorTitle() {
        let o_roadDb = this.state.roadDb;
        let o_daydb = this.state.dayDb;
        if (!o_roadDb || !o_daydb) {
            return '编辑日程';
        } else {
            return `编辑日程：${o_roadDb.name} - 第${o_daydb.day_index + 1}天`;
        }
    }

    /**
     * 组件绑定更新完成
     * @param prevProps 
     * @param prevState 
     * @param snapshot 
     */
    componentDidUpdate(prevProps: Readonly<IDayPlanEditorProps>, prevState: Readonly<IDayPlanEditorState>, snapshot?: any): void {
        
        // 节点调整时序不会完整更新ref，因此需要等全部更新完毕后，再调整节点顺序
        if (this.b_willUpdateBmapPoints) {
            this.b_willUpdateBmapPoints = false;
            this.updateMapPoints();
        }

        if (this.b_willParseAndFixData) {
            this.b_willParseAndFixData = false;
            this.parseAndFixData(this.o_openPayload);
        }

    }

    componentWillUnmount(): void {
        if (this.bmap) {
            this.bmap.destroy();
            this.bmap = null;
        }
    }

    async saveDayPlan() {
        let o_daydb = this.state.dayDb;
        if (!o_daydb) {
            message.error('未设置初始日程对象！');
            return;
        }

        let isCreate = false;
        let o_update_daydb: any = {};

        o_update_daydb.road_id = o_daydb.road_id;
        o_update_daydb.day_index = o_daydb.day_index;
        o_update_daydb.update_time = Dayjs().format('YYYY-MM-DD HH:mm:ss');

        if (typeof o_daydb.ID === 'number') {
            o_update_daydb.ID = o_daydb.ID;
        } else {
            o_update_daydb.create_time = Dayjs().format('YYYY-MM-DD HH:mm:ss');
            isCreate = true;
        }

        o_update_daydb.remark = this.state.remark;

        let day_data: any = {};
        day_data.points = this.mNodeComps.map((item: NodeEditor | null) => {
            if (!item) {
                return {};
            }

            return item.getDbData();
        });
        day_data.routes = _.clone(this.o_oplanRoutes);

        o_update_daydb.data = JSON.stringify(day_data);

        console.debug('isCreate', isCreate, o_update_daydb);
        try {
            if (isCreate) {
                await fetch.post('/api/roadPlan/day', o_update_daydb);
            } else {
                await fetch.post('/api/roadPlan/day', o_update_daydb, { params: { ID: o_update_daydb.ID } });
            }
            if (typeof this.props.onFinish === 'function') {
                this.props.onFinish();
            }
            this.setState({ modalOpen: false });
        } catch(e: any) {
            console.error(e);
            message.error(e.message);
        }
    }

    render() {
        return (
            <>
                <Modal title={this.renderEditorTitle()} width="90%" open={this.state.modalOpen} maskClosable={false}
                        onCancel={e => this.onCancel()} footer={null}>
                    <div className="f-flex-row" style={{ height: "70vh" }}>
                        {/* 左操作区 */}
                        <div className="f-flex-col" style={{ width: "550px" }}>
                            <section className="f-flex-1 f-vertical-scroll">
                                <div style={{ marginBottom: '5px' }}>
                                    <h3>日程描述：</h3>
                                    <Input.TextArea value={this.state.remark} 
                                                    onInput={e => this.setState({ remark: e.target.value })}
                                                    style={{ width: "530px" }}/>
                                </div>
                            
                                <div>
                                    <h3>日程明细：</h3>
                                </div>

                                <div className="f-flex-two-side" style={{ marginBottom: '5px', width: '530px' }}>
                                    <div>
                                        <label>启程时间：</label>
                                        <TimePicker value={this.state.startTime} 
                                                    onChange={e => this.setState({ startTime: e })}/>
                                    </div>
                                    <div>
                                        <Button type={this.state.shouldCalculate ? 'primary' : 'default'}
                                                disabled={!this.state.startTime}
                                                onClick={() => this.calculatePlan()}>更新规划</Button>
                                    </div>
                                </div>

                                {/* 节点操作区 */}
                                { this.renderDetail() }
                                <Button type="default" style={{ width: '530px' }} icon={<PlusOutlined/>}
                                        onClick={() => this.appendNode()}>添加明细</Button>
                            </section>

                            <div>
                                <Space align="center">
                                    <Button type="primary" style={{width: '530px'}}
                                        disabled={this.state.shouldCalculate}
                                        onClick={e => this.saveDayPlan()}
                                    >保存日程</Button>
                                </Space>
                            </div>
                        </div>

                        {/* 右操作区 */}
                        <div className="f-flex-1">
                            <div className="f-fit-height f-flex-col m-day_bmap-container">
                                <div>{this.renderMapHint()}</div>

                                <div className="m-day_bmap-toolbox">
                                    <span>查询位置：</span>
                                    <GeoSearch map={() => this.bmap} onAddress={pt => this.onGeoSearchAddress(pt)}/>
                                </div>

                                <div className="f-flex-1 f-relative">
                                    {/* 百度地图容器 */}
                                    <div ref={ comp => this.onMapContainerRef(comp) } className="f-fit-content">
                                        &nbsp;
                                    </div>

                                </div>
                            </div>
                        </div>
                        
                    </div>
                </Modal>
            </>
        );
    }
}

export default DayPlanEditor;
