import fetch from '@/src/fetch';
import { message } from 'antd';
import DayJS from 'dayjs';

interface IHandlers {
    onClick?: Function
    onFavClick?: Function
}

export default class EditorAmap {

    private map: any = null;
    private onClickHandler: Function | null = null;
    private onFavClickHandler: Function | null = null;
    private mk_nodePoints: any[];
    private mk_planRoutes: any[];
    private mk_search: any;
    private mk_fav: any[];

    constructor(divOrId: HTMLDivElement | string, handlers?: IHandlers) {

        this.mk_nodePoints = [];
        this.mk_planRoutes = [];
        this.mk_fav = [];

        this.initAmap(divOrId);

        if (handlers?.onClick) {
            this.onClickHandler = handlers.onClick;
        }

        if (handlers?.onFavClick) {
            this.onFavClickHandler = handlers.onFavClick;
        }
    }

    initAmap(divOrId: HTMLDivElement | string) {
        try {
            if (!this.map) {

                console.debug('init amap in', divOrId);
                if (typeof divOrId === 'string') {
                    let div = document.getElementById(divOrId);
                    console.debug('init amap in', div);
                }

                let center = [116.397428, 39.90923]; // 北京

                let map = new AMap.Map(divOrId, {
                    viewMode: '2D',  // 默认使用 2D 模式
                    zoom: 11,  //初始化地图层级
                    center
                });

                
                // 添加点击事件
                map.on('click', (e: any) => this.onClickMap(e));

                this.map = map;
                console.debug('editor amap created', map.getZoom(), map.getCenter());
            }
        } catch(e) {
            console.error(e);
        }
    }

    onClickMap(e: any) {
        console.debug('on amap click', e);

        let pt: any = {
            lng: e.lnglat.getLng(),
            lat: e.lnglat.getLat()
        };

        if (this.onClickHandler) {
            this.onClickHandler(pt);
        }
    }

    getMap() {
        return this.map;
    }

    getPointAddress(lng: number, lat: number) {
        
    }

    destroy() {
        this.map.destroy();
        this.map = null;
        console.debug('editor amap destroyed');
    }

    async drawSearch(lng: number, lat: number) {
        
        // 添加标记点
        let marker = new AMap.Marker({
            position: [lng, lat],
        });

        let markerContent = document.createElement("div");
        markerContent.style.width = '0';
        markerContent.style.height = '0';
        markerContent.style.overflow = 'visible';

        let img = new BMapGL.SVGSymbol(
            await fetch.get('/mapicons/Target.svg'),
            {
                rotation: 0,
                fillColor: 'red',
                fillOpacity : 1,
                scale: 0.05,
                anchor: new BMapGL.Size(530, 560)
            }
        )
        
        let { width, height } = img.imageSize;
        let offsetLeft = -img.anchor.width;
        let offsetHeight = -img.anchor.height;
        let svgRaw = img._rawPath;
        let svgStyle = img.style;

        let parser = new DOMParser();
        let svgDoc = parser.parseFromString(svgRaw, 'image/svg+xml');
        
        let svg = svgDoc.getElementsByTagName('svg')[0];
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        
        svg.style.fill = svgStyle.fillColor;
        svg.style.fillOpacity = svgStyle.fillOpacity;
        svg.style.position = 'absolute';
        svg.style.top = offsetHeight + 'px';
        svg.style.left = offsetLeft + 'px';

        markerContent.appendChild(svg);

        marker.setContent(markerContent);

        try {
            marker.setMap(this.map);
            this.mk_search = marker;

            console.info('!!!!!!!!!!!!!!!!!!!', this);
        } catch(e) {
            console.error(e);
        }
    }

    /**
     * 在地图上画点
     * @param ptList 
     */
    drawPoints(ptList: any[]) {

        console.debug('amap drawPoints', ptList);

        // 移除搜索点
        if (this.mk_search) {
            this.mk_search.setMap(null);
            this.mk_search = undefined;
        }

        ptList.forEach(pInfo => {
            // 添加标记点
            let marker = new AMap.Marker({
                position: [pInfo.lng, pInfo.lat],
            });

            let markerContent = document.createElement("div");
            markerContent.style.width = '0';
            markerContent.style.height = '0';
            markerContent.style.overflow = 'visible';

            let markerImg = document.createElement("img");
            markerImg.src = "https://a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-red.png";
            markerImg.setAttribute('width', '24px');
            markerImg.setAttribute('height', '34px');
            markerImg.style.position = 'absolute';
            markerImg.style.left = '-12px';
            markerImg.style.top = '-34px';
            markerContent.appendChild(markerImg);
        

            let markLabel = document.createElement("div");
            markLabel.innerHTML = pInfo.addr;
            markLabel.style.color = 'blue';
            markLabel.style.backgroundColor = 'white';
            markLabel.style.borderRadius = '4px';
            markLabel.style.border = '1px #ccc solid';
            markLabel.style.padding = '3px 5px';
            markLabel.style.fontSize = '10px';
            markLabel.style.height = '20px';
            markLabel.style.lineHeight = '10px';
            markLabel.style.fontFamily = '微软雅黑';
            markLabel.style.whiteSpace = 'nowrap';
            markLabel.style.position = 'absolute';
            markLabel.style.top = '-15px';
            markLabel.style.left = '20px';

            markerContent.appendChild(markLabel);

            marker.setContent(markerContent);

            try {
                marker.setMap(this.map);

                this.mk_nodePoints.push(marker);

                console.info('!!!!!!!!!!!!!!!!!!!', this.map, { label: markLabel, icon: markerImg });
            } catch(e) {
                console.error(e);
            }
        });
    }

    clearSearch() {
        // 移除旧搜索点
        if (this.mk_search) {
            this.mk_search.setMap(null);
            this.mk_search = undefined;
        }
    }

    drawFav(ptList: any[]) {
        let _this = this;

        // 先清除掉所有点位
        this.clearFav();

        ptList.forEach(pInfo => {
            // 添加标记点
            let marker = new AMap.Marker({
                position: [pInfo.lng, pInfo.lat],
            });

            let markerContent = document.createElement("div");
            markerContent.style.width = '0';
            markerContent.style.height = '0';
            markerContent.style.overflow = 'visible';

            let markerImg = document.createElement("img");
            markerImg.src = "/mapicons/default.png";
            markerImg.setAttribute('width', '24px');
            markerImg.setAttribute('height', '24px');
            markerImg.style.position = 'absolute';
            markerImg.style.left = '-12px';
            markerImg.style.top = '-12px';
            markerContent.appendChild(markerImg);
        

            let markLabel = document.createElement("div");
            markLabel.innerHTML = pInfo.label;
            markLabel.style.color = 'blue';
            markLabel.style.backgroundColor = 'white';
            markLabel.style.borderRadius = '4px';
            markLabel.style.border = '1px #ccc solid';
            markLabel.style.padding = '3px 5px';
            markLabel.style.fontSize = '10px';
            markLabel.style.height = '20px';
            markLabel.style.lineHeight = '10px';
            markLabel.style.fontFamily = '微软雅黑';
            markLabel.style.whiteSpace = 'nowrap';
            markLabel.style.position = 'absolute';
            markLabel.style.top = '-15px';
            markLabel.style.left = '20px';

            markerContent.appendChild(markLabel);

            marker.setContent(markerContent);

            marker.on('click', (e: any) => {
                if (_this.onFavClickHandler) {
                    let fn = _this.onFavClickHandler;
                    fn(pInfo);
                }
            });

            try {
                marker.setMap(this.map);

                this.mk_fav.push(marker);

                console.info('!!!!!!!!!!!!!!!!!!!', this.map, { label: markLabel, icon: markerImg });
            } catch(e) {
                console.error(e);
            }
        });
    }

    clearFav() {
        this.mk_fav.forEach(item => {
            item.setMap(null);
        });
        this.mk_fav = [];
    }

    clearPoints() {
        // 首先移除所有的点位
        this.mk_nodePoints.forEach(item => {
            item.setMap(null);
        });
        this.mk_nodePoints = [];
    }

    clearMap() {
        this.mk_planRoutes.forEach(item => {
            item.setMap(null);
        });
        this.mk_planRoutes = [];

        this.mk_nodePoints.forEach(item => {
            item.setMap(null);
        });
        this.mk_nodePoints = [];

        if (this.mk_search) {
            this.mk_search.setMap(null);
            this.mk_search = null;
        }

        this.mk_fav.forEach(item => {
            item.setMap(null);
        });
        this.mk_fav = [];
    }

    centerAndZoom(lng: number, lat: number, zoom: number) {
        this.map.setCenter([lng, lat]);
        this.map.setZoom(zoom);
    }

    adjustPoints(ptList: any[]) {

        console.debug('amap editor adjustPoints', ptList);

        if (!ptList?.length) {
            return;
        }

        let top: number = ptList[0].lat;
        let right: number = ptList[0].lng;
        let bottom: number = ptList[0].lat;
        let left: number = ptList[0].lng;

        for (let i = 1; i < ptList.length; i++) {
            let pt = ptList[i];
            top = Math.max(top, pt.lat);
            right = Math.max(right, pt.lng);
            bottom = Math.min(bottom, pt.lat);
            left = Math.min(left, pt.lng);
        }

        let bounds = new AMap.Bounds(
            [left, top],
            [right, bottom]
        );
        this.map.setBounds(bounds, false, [50, 50, 50, 50]);
    }

    /**
     * 在地图上画出路线
     * @param routeDatas 
     */
    drawPlans(routeDatas: any[]) {
        this.mk_planRoutes.forEach(item => {
            item.setMap(null)
        });
        this.mk_planRoutes = [];

        routeDatas.forEach((data, index) => {
            let path = data.path;
            if (path.length === 0) {
                return;
            }

            let isFlyOrRail = false;
            if (data.path[0].type === 'rail' || data.path[0].type === 'fly') {
                isFlyOrRail = true;
            }

            try {
                let strokeColor = (index % 2 === 0) ? 'blue' : 'green';
                let strokeWeight = 4, strokeOpacity = 0.8;
                if (isFlyOrRail) {
                    strokeColor = 'gray';
                    strokeWeight = 2;
                    strokeOpacity = 0.3;
                }

                let apath = path.map((item: any) => [item.lng, item.lat]);
                let poly = new AMap.Polyline({
                    strokeColor,
                    strokeWeight,
                    strokeOpacity,
                    path: apath,
                    isOutline: false,
                    borderWeight: 0,
                    strokeStyle: "solid",
                    lineJoin: 'round',
                    lineCap: 'round',
                    zIndex: 50,
                });

                poly.setMap(this.map);
                this.mk_planRoutes.push(poly);
            } catch(e: any) {
                console.error(e);
            }
        })
    }

    async calculatePlan(pts: any[]) {
        // 少于2个节点无法计算
        if (pts.length < 1) {
            message.error('可使用的点位少于2个，请编辑后再进行计算！');
            return;
        }

        // 路径点两两组成分段
        let routes: (number[] | any)[] = pts.map((item, index, arr) => {
            if (index === 0) {
                return [];
            } else {
                let prev = [arr[index - 1].lng, arr[index - 1].lat];
                let next = [item.lng, item.lat];

                let config = {
                    drivingType: item.drivingType || 'car',
                    travelTime: item.travelTime || 0
                }

                return [prev, next, config];
            }
        });

        console.debug('routes', routes);

        // 从百度地图获取路径规划数据
        let routesPlans: any = await Promise.all(routes.map((item, index) => {
            if (item?.length < 2) {
                return Promise.resolve(null);
            } else {
                return new Promise((cb) => {
                    let driving = new AMap.Driving({
                        policy: AMap.DrivingPolicy.LEAST_TIME
                    }); 
                    // 根据起终点经纬度规划驾车导航路线

                    let [prev, next, config] = item;

                    if (config?.drivingType === 'car') {
                        driving.search(
                            new AMap.LngLat(...prev), 
                            new AMap.LngLat(...next), 
                            function(status: string, result: any) {
                                console.debug(status, result);
                                
                                // result 即是对应的驾车导航信息，相关数据结构文档请参考  https://lbs.amap.com/api/javascript-api/reference/route-search#m_DrivingResult
                                if (status === 'complete') {
                                    console.warn('绘制驾车路线完成')
                                    cb(result.routes[0])
                                } else {
                                    console.error('获取驾车数据失败')
                                    cb(null)
                                }
                            }
                        );
                    } else if (config?.drivingType === 'rail' || config?.drivingType === 'fly') {
                        let time = 0;
                        let t1 = config.travelTime;
                        let t0 = t1.startOf('day');
                        time = DayJS.duration(t1.diff(t0)).asSeconds();

                        cb({
                            steps: [
                                {
                                    path: [
                                        new AMap.LngLat(...prev), 
                                        new AMap.LngLat(...next), 
                                    ],
                                    distance: 0,
                                    time,
                                    type: config.drivingType
                                }
                            ]
                        })
                    }
                })
            }
        }));

        console.info('routesPlan ==> ', routesPlans);

        // 从百度地图数据拆解出关键节点数据及路径数据
        let routesDatas = routesPlans.map((planItem: any) => {
            console.debug('planItem', planItem);

            if (planItem === null || planItem === undefined) {
                return {
                    path: [],
                    distance: 0,
                    duration: 0
                }
            } else {
                let path = [];
                let distance = 0;
                let duration = 0;
                
                let steps = planItem.steps;
                for (let step of steps) {
                    let stepPath = step.path || [];
                    for (let pItem of stepPath) {
                        let obj: any = {
                            lng: pItem.lng,
                            lat: pItem.lat
                        };

                        console.debug('step?.type', step?.type)
                        if (step?.type) {
                            obj.type = step.type;
                        }

                        path.push(obj)
                    }
                    
                    distance += step.distance;
                    duration += step.time;
                }

                console.debug(distance, duration, path);

                return {
                    path,
                    distance,
                    duration
                }
            }
        });

        return routesDatas;
    }
}