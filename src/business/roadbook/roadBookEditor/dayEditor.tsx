import React, { useEffect, useState } from "react";
import { Modal, Input, Button, message, AutoComplete, Select, Space, TimePicker } from "antd";
import _ from 'lodash';
import { ExclamationCircleFilled, PlusOutlined } from '@ant-design/icons';
import confirm from "antd/es/modal/confirm";
import NodeEditor from "./nodeEditor";
import uuid from "@/src/utils/common/uuid";
import { Dayjs } from 'dayjs';

interface IDayPlanEditorProps {
    onFinish?: Function
}

interface IDayPlanEditorState {
    modalOpen: boolean,
    loading: boolean,
    dayPlanDetail: Array<any>,
    posText: string,
    isLocatingNode: boolean,
    locateNodeIndex: number | null,
    shouldCalculate: boolean,
    startTime: Dayjs | null
}

function GeoSearch(props) {
    let [compOpts, setCompOpts] = useState([]);
    let [pois, setPois] = useState([]);

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

    return <Select style={{ width: '200px' }}
                    options={compOpts} filterOption={false} 
                    showSearch onSearch={onSearch} onSelect={onSelect}></Select>
}

class DayPlanEditor extends React.Component<IDayPlanEditorProps, IDayPlanEditorState> {

    private oldData: any;
    private mMapContainer: HTMLDivElement | null = null;
    private bmap: any;
    private mNodeComps: Array<NodeEditor | null>;
    private mk_nodePoints: any[];
    private mk_planRoutes: any[];
    private b_willUpdateBmapPoints: boolean;

    constructor(props: IDayPlanEditorProps) {
        super(props);

        this.state = {
            modalOpen: true,
            loading: false,
            posText: '',
            dayPlanDetail: [],
            isLocatingNode: false,
            locateNodeIndex: null,
            shouldCalculate: false,
            startTime: null,
        }

        this.mNodeComps = [];
        this.mk_nodePoints = [];
        this.mk_planRoutes = [];
        this.b_willUpdateBmapPoints = false;
    }

    show() {
        this.setState({
            modalOpen: true
        });
    }

    parseAndFixData(data: any) {
        
    }

    showAndEdit(data: any) {
        this.setState({
            modalOpen: true
        });

        this.oldData = _.clone(data);
        this.parseAndFixData(this.oldData);
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

    async onFinish(data: any) {
        this.hide();

        let cb = this.props.onFinish;
        if (cb) {
            cb(data);
        }
    }

    onFinishedFailed() {
        message.warning('表单校验失败，请修改');
    }

    onCancel() {
        this.hide();
    }

    appendNode() {
        let detailArr = [...this.state.dayPlanDetail];
        detailArr.push({ uuid: uuid() });

        this.setState({
            dayPlanDetail: detailArr
        })
    }

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
                dayPlanDetail: detailArr
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

    moveUpNode(index: number) {
        let detailArr = [...this.state.dayPlanDetail];
        let itemWillMove = detailArr[index]; 
        detailArr.splice(index, 1);
        detailArr.splice(index - 1, 0, itemWillMove);
        this.setState({
            dayPlanDetail: detailArr
        });
    }

    moveDownNode(index: number) {
        let detailArr = [...this.state.dayPlanDetail];
        let itemWillMove = detailArr[index]; 
        detailArr.splice(index, 1);
        detailArr.splice(index + 1, 0, itemWillMove);
        this.setState({
            dayPlanDetail: detailArr
        });
    }

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

    onGeoSearchAddress(pt) {
        this.bmap.centerAndZoom(pt, 15);
    }

    willUpdateMapPoints() {
        this.b_willUpdateBmapPoints = true;
    }

    // 更新地图上所有点位
    updateMapPoints() {
        this.setState({ shouldCalculate: true });

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
                addr: addr || `${index}号节点`
            })
        });


        ptList.forEach(pInfo => {
            let pt = new BMapGL.Point(pInfo.lng, pInfo.lat);

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
        });
    }

    /**
     * 地图点击动作
     * @param e 
     */
    async onClickMap(e: any) {
        let pt = e.latlng;
        let addr = await this.getPointAddress(pt);

        if (this.state.isLocatingNode && this.state.locateNodeIndex !== null) {
            let nodeComp = this.mNodeComps[this.state.locateNodeIndex];
            if (!nodeComp) {
                message.error('找不到对应节点');
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
        
    }


    async calculatePlan() {
        let pts: any[] = [];
        
        this.mNodeComps.forEach(comp => {
            if (!comp?.state?.lng || !comp?.state?.lat)
                return;

            pts.push(new BMapGL.Point(comp.state.lng, comp.state.lat));
        });

        if (pts.length < 1) {
            message.error('可使用的点位少于2个，请编辑后再进行计算！');
            return;
        }

        let routes = pts.map((item, index, arr) => {
            if (index === 0) {
                return [];
            } else {
                return [arr[index - 1], item];
            }
        });

        console.debug('routes', routes);

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

        this.drawPlans(routesDatas);
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

        routeDatas.forEach(data => {
            let path = data.path;
            if (path.length === 0) {
                return;
            }

            let poly = new BMapGL.Polyline(
                path.map((ptObj: any) => new BMapGL.Point(ptObj.lng, ptObj.lat)),
                {
                    strokeColor: 'blue',
                    strokeWeight: 4,
                    strokeOpacity: 0.8
                }
            );

            this.bmap.addOverlay(poly);
            this.mk_planRoutes.push(poly);

        })
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

    componentDidUpdate(prevProps: Readonly<IDayPlanEditorProps>, prevState: Readonly<IDayPlanEditorState>, snapshot?: any): void {
        if (this.b_willUpdateBmapPoints) {
            this.b_willUpdateBmapPoints = false;
            this.updateMapPoints();
        }

        console.debug('startTime', this.state.startTime);
    }

    render() {
        return (
            <>
                <Modal title={'编辑日程'} width="90%" open={this.state.modalOpen} maskClosable={false}
                        onCancel={e => this.onCancel()} footer={null}>
                    <div className="f-flex-row" style={{ height: "600px" }}>
                        <div className="f-flex-col" style={{ width: "550px" }}>
                            <section className="f-flex-1 f-vertical-scroll">
                                <div style={{ marginBottom: '5px' }}>
                                    <h3>日程描述：</h3>
                                    <Input.TextArea  style={{ width: "530px" }}/>
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
                                        <Button onClick={() => this.calculatePlan()}>更新规划</Button>
                                    </div>
                                </div>
                                { this.renderDetail() }
                                <Button type="default" style={{ width: '530px' }} icon={<PlusOutlined/>}
                                        onClick={() => this.appendNode()}>添加明细</Button>
                            </section>

                            <div>
                                <Space align="center">
                                    
                                    <Button>保存日程</Button>
                                </Space>
                            </div>
                        </div>
                        <div className="f-flex-1">
                            <div className="f-fit-height f-flex-col m-day_bmap-container">
                                <div>{this.renderMapHint()}</div>

                                <div className="m-day_bmap-toolbox">
                                    <span>查询位置：</span>
                                    <GeoSearch map={() => this.bmap} onAddress={pt => this.onGeoSearchAddress(pt)}/>
                                </div>

                                <div className="f-flex-1 f-relative">

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
