import { useEffect, useRef, useState } from "react";
import BmapContext from "./BmapContext";
import Marker from "./Marker";
import Polyline from "./Polyline";
import uuid from "@/src/utils/common/uuid";

interface ICommonBmap {
    children?: any,
    initPoint?: { lng: number, lat: number },
    center?: { lng: number, lat: number }
    viewport?: { lng: number, lat: number }[],
    onReady?: Function
    onClick?: Function
    mapType?: string | null
}

function CommonBmap(props: ICommonBmap) {
    let mBmapDiv = useRef<HTMLDivElement | null>(null);
    let mAmapDiv = useRef<HTMLDivElement | null>(null);

    let [amap, setAmap] = useState<any>(null);
    let [bmap, setBmap] = useState<any>(null);
    let [containerId, setContainerId] = useState(0);
    let [lastMapType, setLastMapType] = useState<string | null>(null);

    /**
     * 获取地图某一点位置
     * @param point 
     * @returns 
     */
    function getPointAddress(point: any) {
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

    async function onClickMap(e: any) {
        let pt: any = e.latlng;
        let addr: any = await getPointAddress(pt);

        if (typeof props.onClick === 'function') {
            props.onClick(pt, addr);
        }
    }

    function getMapType() {
        if (props.mapType) {
            return props.mapType;
        } else {
            return 'baidu'; // 缺省为百度地图
        }
    }

    function initBaiduMap(div: HTMLDivElement) {
        console.debug('初始化百度地图');

        let map = new BMapGL.Map(div);
        map.enableScrollWheelZoom();
        map.disableDoubleClickZoom();

        // 设置初始中心点
        let point = new BMapGL.Point(
            props.initPoint?.lng || 116.404, 
            props.initPoint?.lat || 39.915
        );
        map.centerAndZoom(point, 12);

        let scaleCtrl = new BMapGL.ScaleControl();  // 添加比例尺控件
        map.addControl(scaleCtrl);

        let zoomCtrl = new BMapGL.ZoomControl();  // 添加缩放控件
        map.addControl(zoomCtrl);

        let cityControl = new BMapGL.CityListControl({
            // 控件的停靠位置（可选，默认左上角）
            // @ts-ignore
            anchor: BMAP_ANCHOR_TOP_LEFT,
            // 控件基于停靠位置的偏移量（可选）
            offset: new BMapGL.Size(10, 5)
        });
        // 将控件添加到地图上
        map.addControl(cityControl);

            // 创建定位控件
        let locationControl = new BMapGL.LocationControl({
            // 控件的停靠位置（可选，默认左上角）
            // @ts-ignore
            anchor: BMAP_ANCHOR_TOP_RIGHT,
            // 控件基于停靠位置的偏移量（可选）
            offset: new BMapGL.Size(5, 5)
        });
        // 将控件添加到地图上
        map.addControl(locationControl);

        // 添加点击事件
        map.addEventListener('click', (e: any) => onClickMap(e));

        // 回传map对象
        if (typeof props.onReady === 'function') {
            props.onReady(map);
        }

        return map;
    }

    /**
     * 初始化高德地图
     * @param div 
     * @returns 
     */
    function initGaodeMap(div: HTMLDivElement) {
        console.debug('初始化高德地图');
        div.id = 'gaodeMap-' + uuid();

        let center = [116.397428, 39.90923]; // 北京
        if (props.center) {
            center = [props.center.lng, props.center.lat];
        }

        let map = new AMap.Map(div.id, {
            viewMode: '2D',  // 默认使用 2D 模式
            zoom: 11,  //初始化地图层级
            center
        });
        return map;
    }

    function simplifyViewport() {
        if (!props.viewport?.length) {
            return [];
        }

        let top: number = props.viewport[0].lat;
        let right: number = props.viewport[0].lng;
        let bottom: number = props.viewport[0].lat;
        let left: number = props.viewport[0].lng;

        for (let i = 1; i < props.viewport.length; i++) {
            let pt = props.viewport[i];
            top = Math.max(top, pt.lat);
            right = Math.max(right, pt.lng);
            bottom = Math.min(bottom, pt.lat);
            left = Math.min(left, pt.lng);
        }

        return [left, top, right, bottom];
    }

    /**
     * 修改百度地图显示区域
     * @param lng1 
     * @param lat1 
     * @param lng2 
     * @param lat2 
     */
    function setBmapViewport(map?: any, lng1?: number, lat1?: number, lng2?: number, lat2?: number) {

        console.debug('更新百度地图区域');

        if (props.viewport?.length && arguments.length === 0) {
            [lng1, lat1, lng2, lat2] = simplifyViewport();
            map = bmap;
        } else if (props.viewport?.length && arguments.length === 1) {
            [lng1, lat1, lng2, lat2] = simplifyViewport();
        } else if (arguments.length !== 5) {
            return;
        }

        if (map?.setViewport) { // 百度地图接口
            map.setViewport([
                new BMapGL.Point(lng1, lat1),
                new BMapGL.Point(lng2, lat2)
            ])
        }
    }

    /**
     * 修改高德地图显示区域
     * @param lng1 
     * @param lat1 
     * @param lng2 
     * @param lat2 
     */
    function setAmapViewport(map?: any, lng1?: number, lat1?: number, lng2?: number, lat2?: number) {

        console.debug('更新高德地图区域');

        if (props.viewport?.length && arguments.length === 0) {
            [lng1, lat1, lng2, lat2] = simplifyViewport();
            map = amap;
        } else if (props.viewport?.length && arguments.length === 1) {
            [lng1, lat1, lng2, lat2] = simplifyViewport();
        } else if (arguments.length !== 5) {
            return;
        }

        try {
            if (map?.setBounds) {
                let bounds = new AMap.Bounds(
                    [lng1, lat1],
                    [lng2, lat2]
                );
                map.setBounds(bounds, false, [50, 50, 50, 50]);
            }
        } catch(e) {
            console.error(e);
        }
    }

    /**
     * 设置百度地图中心
     * @param map 
     * @param lng 
     * @param lat 
     */
    function setBmapCenter(map?: any, lng?: number, lat?: number) {
        if (props.center && arguments.length === 0) {
            ({lng, lat} = props.center);
            map = bmap;
        } else if (props.center && arguments.length === 1) {
            ({lng, lat} = props.center);
        } else if (arguments.length !== 5) {
            return;
        }

        let pt = new BMapGL.Point(lng, lat);
        map.centerAndZoom(pt, 12);
    }

    /**
     * 设置高德地图中心
     * @param map 
     * @param lng 
     * @param lat 
     */
    function setAmapCenter(map?: any, lng?: number, lat?: number) {
        if (props.center && arguments.length === 0) {
            ({lng, lat} = props.center);
            map = amap;
        } else if (props.center && arguments.length === 1) {
            ({lng, lat} = props.center);
        } else if (arguments.length !== 5) {
            return;
        }

        try {
            map.setCenter([lng, lat]);
            map.setZoom(12);
        } catch(e) {
            console.error(e);
        }
    }

    // 当地图类型、容器发生变更时，触发此事件
    useEffect(() => {
        let mapType = props.mapType;
        if (!mapType) {
            mapType = 'baidu';
        }

        if (mapType === 'baidu') {
            let div = mBmapDiv.current;
            if (!div) {
                return;
            }

            // 如果百度地图不存在，初始化百度地图
            let map = bmap;
            if (!map) {
                map = initBaiduMap(div);
                setBmap(map);
            }

            // 如果存在viewPort，更新地图显示范围
            if (props.viewport?.length) {
                setTimeout(() => {
                    setBmapViewport(map);
                }, 200);
            }
            
        } else if (mapType === 'gaode') {
            let div = mAmapDiv.current;
            if (!div) {
                return;
            }

            // 如果高德地图不存在，初始化高德地图
            let map = amap;
            if (!map) {
                map = initGaodeMap(div);
                setAmap(map);
            }

            // 如果存在viewPort，更新地图显示范围
            if (props.viewport?.length) {
                setTimeout(() => {
                    setAmapViewport(map);
                }, 200);
            }
        }

        
        setLastMapType(mapType);

    }, [props.mapType, mAmapDiv, mBmapDiv]);



    useEffect(() => {
        return function onDestroy() {
            if (amap) {
                amap.destroy();
            }

            if (bmap) {
                bmap.destroy();
            }
        }
    }, []);

    // 如果中心点发生变化，让地图做出同步修改
    useEffect(() => {
        if (getMapType() === 'baidu') {
            setBmapCenter();
        } else if (getMapType() === 'gaode') {
            setAmapCenter();
        }

    }, [props.center]);

    // 如果地图范围发生变化，让地图做出同步修改
    useEffect(() => {
        if (!props.viewport?.length) {
            return;
        }

        if (getMapType() === 'baidu') {
            setBmapViewport();
        } else if (getMapType() === 'gaode') {
            setAmapViewport();
        }
    }, [props.viewport]);



    // 控制哪张地图显示在界面上
    let amapStyle: any = {};
    let bmapStyle: any = {};

    if (props.mapType === 'baidu' || !props.mapType) {
        amapStyle.display = 'none';
    } 

    if (props.mapType === 'gaode') {
        bmapStyle.display = 'none';
    }

    return (
        <>
            { /* @ts-ignore */ }
            <div ref={mAmapDiv} className="f-fit-content m-common-amap-container" style={amapStyle} data-containerid={containerId}></div>
            <div ref={mBmapDiv} className="f-fit-content m-common-bmap-container" style={bmapStyle} data-containerid={containerId}></div>
            <BmapContext.Provider value={{ mapType: getMapType(), bmap, amap}}>
                { props.children }
            </BmapContext.Provider>
        </>
    )
}

CommonBmap.Marker = Marker;
CommonBmap.Polyline = Polyline;

export default CommonBmap;