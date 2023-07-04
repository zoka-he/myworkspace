import { message } from "antd";
import fetch from '@/src/fetch';

async function httpGetAsString(url: string) {
    let ret = await fetch.get(url);
    return '' + ret;
}

interface IHandlers {
    onClick?: Function
}

export default class EditorBmap {

    private map: any = null;
    private onClickHandler: Function | null = null;
    private mk_nodePoints: any[];
    private mk_planRoutes: any[];
    private mk_search: any;

    constructor(div: HTMLDivElement, handlers?: IHandlers) {

        this.mk_nodePoints = [];
        this.mk_planRoutes = [];

        this.initBmap(div);

        if (handlers?.onClick) {
            this.onClickHandler = handlers.onClick;
        }
    }

    initBmap(div: HTMLDivElement) {
        if (!this.map) {
            let map = new BMapGL.Map(div);
            map.enableScrollWheelZoom();
            map.disableDoubleClickZoom();

            // 设置初始中心点
            let point = new BMapGL.Point(116.404, 39.915);
            map.centerAndZoom(point, 12);

            // 添加点击事件
            map.addEventListener('click', (e: any) => this.onClickMap(e));

            this.map = map;
            console.debug('editor bmap created');
        }
    }

    onClickMap(e: any) {
        let pt: any = e.latlng;
        if (this.onClickHandler) {
            this.onClickHandler(pt);
        }
    }

    getMap() {
        return this.map;
    }

    getPointAddress(lng: number, lat: number) {
        return new Promise(cb => {
            let myGeo = new BMapGL.Geocoder();     
            let point = new BMapGL.Point(lng, lat);

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

    destroy() {
        this.map.destroy();
        this.map = null;
        console.debug('editor bmap destroyed');
    }

    async drawSearch(lng: number, lat: number) {
        // 添加新搜索点
        let svg_searchAddr = await httpGetAsString('/mapicons/Target.svg');
        let mk = new BMapGL.Marker(
            new BMapGL.Point(lng, lat),
            {
                // 设置自定义path路径25325l99
                icon: new BMapGL.SVGSymbol(
                    svg_searchAddr,
                    {
                        rotation: 0,
                        fillColor: 'red',
                        fillOpacity : 1,
                        scale: 0.05,
                        anchor: new BMapGL.Size(530, 560)
                    }
                )
            }
        );

        this.mk_search = mk;
        this.map.addOverlay(mk);
    }

    /**
     * 在地图上画点
     * @param ptList 
     */
    drawPoints(ptList: any[]) {

        // 移除搜索点
        if (this.mk_search) {
            this.map.removeOverlay(this.mk_search);
            this.mk_search = undefined;
        }

        ptList.forEach(pInfo => {
            let pt = new BMapGL.Point(pInfo.lng, pInfo.lat);
            let comp = pInfo.comp;

            let marker = new BMapGL.Marker(pt);
            this.map.addOverlay(marker);
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

            this.map.addOverlay(label);
            this.mk_nodePoints.push(label);


            // 给节点增加拖拽功能，拖拽后，需要同步更改标签位置及comp数据
            if (comp) {
                marker.addEventListener('dragging', (e: any) => {
                    // console.debug('dragging', e.point?.lng, e.point?.lat);
                    label.setPosition(e.point);
                });
                marker.addEventListener('dragend', (e: any)  => {
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

    

    /**
     * 在地图上画出路线
     * @param routeDatas 
     */
    drawPlans(routeDatas: any[]) {
        this.mk_planRoutes.forEach(item => {
            this.map.removeOverlay(item);
        });
        this.mk_planRoutes = [];

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

                this.map.addOverlay(poly);
                this.mk_planRoutes.push(poly);
            } catch(e: any) {
                console.error(e);
            }
        })
    }

    clearSearch() {
        // 移除旧搜索点
        if (this.mk_search) {
            this.map.removeOverlay(this.mk_search);
            this.mk_search = undefined;
        }
    }

    clearPoints() {
        // 首先移除所有的点位
        this.mk_nodePoints.forEach(item => {
            this.map.removeOverlay(item);
        });
        this.mk_nodePoints = [];
    }

    clearMap() {
        this.mk_planRoutes.forEach(item => {
            this.map.removeOverlay(item);
        });
        this.mk_planRoutes = [];

        this.mk_nodePoints.forEach(item => {
            this.map.removeOverlay(item);
        });
        this.mk_nodePoints = [];

        if (this.mk_search) {
            this.map.removeOverlay(this.mk_search);
            this.mk_search = null;
        }
    }

    centerAndZoom(lng: number, lat: number, zoom: number) {
        this.map.centerAndZoom(new BMapGL.Point(lng, lat), zoom);
    }

    adjustPoints(ptList: any[]) {
        let points: any = [];
        ptList.forEach(pInfo => {
            if (pInfo.lng && pInfo.lat) {
                let pt = new BMapGL.Point(pInfo.lng, pInfo.lat);
                points.push(pt);
            }
        });

        if (this.map) {
            this.map.setViewport(points);
        }
    }

    async calculatePlan(pts: any[]) {
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
                let prev = new BMapGL.Point(arr[index - 1].lng, arr[index - 1].lat);
                let next = new BMapGL.Point(item.lng, item.lat);
                return [prev, next];
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
                        this.map, 
                        {
                            onSearchComplete(results: any) {
                                // @ts-ignore
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
        let routesDatas = routesPlans.map((item: any) => {
            if (item === null || item === undefined) {
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

        return routesDatas;
    }

}