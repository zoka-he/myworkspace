import React, { CSSProperties, useState } from "react";
import { Modal, Input, Button, message, Select, Space, TimePicker, Progress } from "antd";
import _ from 'lodash';
import { PlusOutlined } from '@ant-design/icons';
import NodeEditor from "./nodeEditor";
import uuid from "@/src/utils/common/uuid";
import * as Dayjs from 'dayjs';
import fetch from '@/src/fetch';
import parseDayDetail from "../parseDayDetail";
import GeoSearch from "./GeoSearch";
import EditorBmap from "./EditorBmap";
import EditorAmap from "./EditorAmap";
import { red, green, orange } from '@ant-design/colors';



interface IDayPlanEditorProps {
    mapType: string
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
    // @ts-ignore
    startTime: Dayjs | null,
    remark: string,
    title: string,
    roadDb?: any,
    dayDb?: any
}

class DayPlanEditor extends React.Component<IDayPlanEditorProps, IDayPlanEditorState> {

    private amap: any;
    private bmap: any;
    private map: any;
    private mNodeComps: Array<NodeEditor | null>;
    
    private o_oplanRoutes: any[];
    private b_willUpdateBmapPoints: boolean;
    private b_willParseAndFixData: boolean;
    private o_openPayload: any[];

    private amapId: string
    

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
            title: '',
            remark: '',
            roadDb: undefined,
            dayDb: undefined,
        }

        this.mNodeComps = [];
        
        this.o_oplanRoutes = [];
        this.b_willUpdateBmapPoints = false;
        this.b_willParseAndFixData = false;
        this.o_openPayload = [];

        this.amapId = 'gaodeMap-' + uuid();
    }

    show() {
        this.setState({
            modalOpen: true
        });
    }

    getEditorMap() {
        if (this.props.mapType === 'gaode') {
            return this.amap;
        } else if (this.props.mapType === 'baidu') {
            return this.bmap;
        } else {
            return this.bmap;
        }
    }

    getAmapStyle(): CSSProperties {
        if (this.props.mapType === 'gaode') {
            return { position: 'absolute', top: '0' };
        } else {
            return { position: 'absolute', transform: 'translateY(114514px)' };
        }
    }

    getBmapStyle(): CSSProperties {
        if (this.props.mapType === 'baidu') {
            return { position: 'absolute', top: '0' };
        } else {
            return { position: 'absolute', transform: 'translateY(114514px)' };
        }
    }
    

    loadDefaultData(prev: any) {
        // 默认每天出发时间为7:30
        // @ts-ignore
        let startTime = Dayjs().startOf('day').add(7.5, 'hour');

        // 默认添加一个节点
        let defaultPoint: any = {
            uuid: uuid()
        };

        let shouldDrawPoint = false;
        if (prev) {
            let prevDetail: any = {};
            try {
                prevDetail = parseDayDetail(prev);
            } catch(e: any) {
                console.error(e);
                message.error(e.message);
            }
            
            if (prevDetail.points?.length) {
                let ptStart = prevDetail.points[prevDetail.points.length - 1];
                defaultPoint.lng = ptStart.lng;
                defaultPoint.lat = ptStart.lat;
                defaultPoint.addr = ptStart.addr;
                shouldDrawPoint = true;
            }
        }

        let dayPlanDetail = [defaultPoint];

        this.setState({
            startTime,
            dayPlanDetail
        });

        // 加载到了点位
        if (shouldDrawPoint) {
            this.getEditorMap().adjustPoints([ defaultPoint ]);
            this.getEditorMap().drawPoints([ defaultPoint ])
        } else {
            if (this.props.mapType === 'gaode') {
                console.debug('refresh gaode');
                setTimeout(() => {
                    this.getEditorMap().adjustPoints([]);
                }, 200)
            }
        }
    }

    /**
     * 从数据库装载日程
     * @param dayDb 
     */
    loadDbData(dayDb: any) {
        console.debug('loadDbData', dayDb);
        let up_state: any = {};

        // 设置描述
        up_state.title = dayDb.name;
        up_state.remark = dayDb.remark;

        let detail: any = {};
        try {
            detail = parseDayDetail(dayDb);
        } catch(e: any) {
            console.error(e);
            message.error(e.message);
        }

        console.debug('dayDetail ========>> ', detail);

        function secondToDayjs(n: number) {
            // @ts-ignore
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
            // 给每个点位增加uuid，否则react判别不出它们的关系，无法实现上下移位
            up_state.dayPlanDetail = detail.points.map((item: any) => {
                return {
                    ...item,
                    uuid: uuid()
                }
            });
            this.getEditorMap().drawPoints(detail.points);
            this.getEditorMap().adjustPoints(detail.points);
        } 

        // 设置路径（如果有）
        if (detail.routes?.length) {
            // 画了会自动保存到 this.o_oplanRoutes
            this.o_oplanRoutes = detail.routes;
            this.getEditorMap().drawPlans(detail.routes);
        }
        
        this.setState(up_state)
    }

    async parseAndFixData(data: any, index: number, prev: any, next: any, ...args: any[]) {
        if (!this.getEditorMap()) {
            

            this.b_willParseAndFixData = true;
            this.o_openPayload = [ data, index, prev, next ];

            console.debug('parseAndFixData => no bmap retry:', this.o_openPayload);

            return;
        }

        console.debug('parseAndFixData', data, index, prev);

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
            this.loadDefaultData(prev);
        } else {
            this.loadDbData(o_daydb);
        }
    }

    showAndEdit(data: any, index: number, prev: any, next: any) {
        this.setState({
            modalOpen: true,
            dayPlanDetail: []
        });

        this.getEditorMap()?.clearMap();

        this.parseAndFixData(data, index, prev, next);
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

        Modal.confirm({
            title: '删除确认',
            // icon: <ExclamationCircleFilled />,
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
    updateNodeComps(comp: any, index: number) {
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
     * 更新地图点位
     * @param pts 
     */
    async onGeoSearchAddress(...pts: any[]) {
        if (pts.length === 0) {
            return;
        }

        let pt = pts[0];
        if (!pt) {
            return;
        }

        console.debug('转移到搜索位置', pt);

        // 移除旧搜索点
        this.getEditorMap().clearSearch();

        // 移动地图
        this.getEditorMap().centerAndZoom(pt.lng, pt.lat, 12);
        
        // 添加新搜索点
        this.getEditorMap().drawSearch(pt.lng, pt.lat);
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
        this.getEditorMap().clearPoints();

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
                addr: addr || `导航点${index}`,
                // comp    // 关联的comp组件
            })
        });

        this.getEditorMap().drawPoints(ptList);
    }

    /**
     * 地图点击动作
     * @param e 
     */
    async onClickMap(pt: any) {
        let addr: any = await this.getEditorMap().getPointAddress(pt.lng, pt.lat);

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
                addr?.longAddr || ''
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
    onBMapContainerRef(comp: HTMLDivElement | null) {

        if (!comp) {
            return;
        }

        if (!this.bmap) {
            this.bmap = new EditorBmap(
                comp,
                {
                    onClick: (e: any) => this.onClickMap(e)
                }
            );
        }

        if (this.b_willParseAndFixData) {
            this.b_willParseAndFixData = false;
            // @ts-ignore
            this.parseAndFixData(...this.o_openPayload);
        }
        
    }

    /**
     * 初始化百度地图
     * @param comp div节点
     * @returns 无返回
     */
    onAMapContainerRef(comp: HTMLDivElement | null) {

        if (!comp) {
            return;
        }

        if (!this.amap) {
            setTimeout(() => {
                // 高德地图与id强制绑定，需要等待到下一个周期等div刷新后再加载
                this.amap = new EditorAmap(
                    this.amapId,
                    {
                        onClick: (e: any) => this.onClickMap(e)
                    }
                );

                if (this.b_willParseAndFixData) {
                    this.b_willParseAndFixData = false;
                    // @ts-ignore
                    this.parseAndFixData(...this.o_openPayload);
                }
            }, 200);
            
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

            pts.push({ 
                lng: comp.state.lng, 
                lat: comp.state.lat,
                drivingType: comp.state.drivingType || 'car',
                travelTime: comp.state.travelTime
            });
        });

        let routesDatas = await this.getEditorMap().calculatePlan(pts);
        console.info('routesDatas', JSON.stringify(routesDatas));

        // 缓存路径数据
        this.o_oplanRoutes = routesDatas;

        // 划线
        this.getEditorMap().drawPlans(routesDatas);

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

                dayTimer = dayTimer.add(Dayjs.duration({ seconds: stayDura }));
                let preferT1 = dayTimer.clone();

                comp.acceptDistAndDura(data.distance, data.duration, [ preferT0, preferT1 ]);
            }
        })
    }

    /**
     * 渲染地图抬头提示
     * @returns 
     */
    renderMapHint() {
        if (this.state.isLocatingNode) {
            return <p className="f-red">导航点{this.state.locateNodeIndex}正在更改定位，请点击地图！如需修改节点名称，请手动清除原有名称！</p>;
        }

        if (this.state.shouldCalculate) {
            return <p className="f-red">节点状态发生变更，请重新计算路径！</p>
        }

        return <p>当前位置：{this.state.posText}</p>;
    }

    getTotalDist() {
        let total = 0;
        if (!this.state.dayPlanDetail?.length) {
            return total;
        }

        this.state.dayPlanDetail.forEach(item => {
            total += item.dist;
        });

        return total;
    }

    getTotalTime() {
        if (!this.state.dayPlanDetail?.length) {
            return 0;
        }

        let detail = this.state.dayPlanDetail;
        let start = detail[0].preferTime[0];
        let end = detail[detail.length - 1].preferTime[1];

        return end - start;
    }

    renderEditorTitle() {
        let o_roadDb = this.state.roadDb;
        let o_daydb = this.state.dayDb;

        let textTitle = null;
        if (!o_roadDb || !o_daydb) {
            textTitle = <span>编辑日程</span>;
        } else {
            textTitle = <span>编辑日程：{o_roadDb.name} - 第{o_daydb.day_index + 1}天</span>;
        }

        console.debug('title state', this.state);

        let totalDist = this.getTotalDist();
        let distPercent = totalDist / 1000 / 500 * 100;
        let distClr: string = green[6];
        if (distPercent >= 100) {
            distClr = red[5];
        } else if (distPercent > 75) {
            distClr = orange[4];
        } 

        let distProgress = [
            <Progress 
                style={{width: '130px'}} 
                percent={Math.min(100, distPercent)}
                strokeColor={distClr}
                showInfo={false}
            />,
            <span style={{color: distClr, marginLeft: '-20px'}}>{(totalDist / 1000).toFixed(1)}km</span>
        ];

        let totalTime = this.getTotalTime();
        let timePercent = totalTime / 3600 / 10 * 100;
        let timeClr: string = green[6];
        if (timePercent >= 100) {
            timeClr = red[5];
        } else if (timePercent > 75) {
            timeClr = orange[4];
        } 
        const getTimeStr = () => {
            let s_HH = Math.floor(totalTime / 3600);
            let s_mm = Math.floor((totalTime % 3600) / 60);
            let s_list = [];
            if (s_HH) {
                s_list.push(s_HH + 'h');
            }
            if (s_mm) {
                s_list.push(s_mm + 'm');
            }
            return s_list.join('');
        }
        let timeProgress = [
            <Progress 
                style={{width: '130px'}} 
                percent={Math.min(100, totalTime / 3600 / 10 * 100)}
                strokeColor={timeClr}
                showInfo={false}
            />,
            <span style={{color: timeClr, marginLeft: '-20px'}}>{getTimeStr()}</span>
        ];

        
        return (
            // @ts-ignore
            <div style={{textWrap: 'nowrap'}}>
                <Space size={20} align="baseline">
                    {textTitle}
                    {distProgress}
                    {timeProgress}
                </Space>
            </div>
        );
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
            // @ts-ignore
            this.parseAndFixData(...this.o_openPayload);
        }

    }

    componentWillUnmount(): void {
        if (this.bmap) {
            this.bmap.destroy();
            this.bmap = null;
        }

        if (this.amap) {
            this.amap.destroy();
            this.amap = null;
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
        // @ts-ignore
        o_update_daydb.update_time = Dayjs().format('YYYY-MM-DD HH:mm:ss');

        if (typeof o_daydb.ID === 'number') {
            o_update_daydb.ID = o_daydb.ID;
        } else {
            // @ts-ignore
            o_update_daydb.create_time = Dayjs().format('YYYY-MM-DD HH:mm:ss');
            isCreate = true;
        }

        o_update_daydb.name = this.state.title;
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

        console.debug('saveDayPlan ======> ', o_update_daydb);
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
                                    <h3>日程标题：</h3>
                                    <Input value={this.state.title} 
                                            onInput={e => this.setState({ title: e.currentTarget.value })}
                                            style={{ width: "530px" }}/>
                                </div>

                                <div style={{ marginBottom: '5px' }}>
                                    <h3>日程描述：</h3>
                                    <Input.TextArea value={this.state.remark} 
                                                    onInput={e => this.setState({ remark: e.currentTarget.value })}
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
                                {/* <div>{this.renderMapHint()}</div> */}

                                <div className="m-day_bmap-toolbox">
                                    <span>查询位置：</span>
                                    <GeoSearch 
                                        mapType={this.props.mapType} 
                                        map={() => this.getEditorMap()} 
                                        amap={this.amap}
                                        bmap={this.bmap}
                                        onAddress={(pt: any) => this.onGeoSearchAddress(pt)}
                                    />
                                </div>

                                <div className="f-flex-1 f-relative f-no-overflow">
                                    {/* 百度地图容器 */}
                                    <div ref={ comp => this.onBMapContainerRef(comp) } className="f-fit-content m-editor-bmap" style={this.getBmapStyle()}></div>

                                    <div id={this.amapId} ref={ comp => this.onAMapContainerRef(comp) } className="f-fit-content m-editor-amap" style={this.getAmapStyle()}></div>

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
