import { useEffect, useRef, useState } from "react";
import BmapContext from "./BmapContext";
import Marker from "./Marker";
import Polyline from "./Polyline";

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

    function initGaodeMap(div: HTMLDivElement) {
        console.debug('初始化高德地图');

        let map = new AMap.Map(div, {
            viewMode: '2D',  // 默认使用 2D 模式
            zoom: 11,  //初始化地图层级
            center: [116.397428, 39.90923]  //初始化地图中心点
        });
        return map;
    }

    useEffect(() => {
        let mapType = props.mapType;
        if (!mapType) {
            mapType = 'baidu';
        }

        if (mapType === 'baidu') {
            let div = mBmapDiv.current;
            if (!div || bmap) {
                return;
            }

            let map = initBaiduMap(div);
            setBmap(map);
        } else if (mapType === 'gaode') {
            let div = mAmapDiv.current;
            if (!div || amap) {
                return;
            }
            let map = initGaodeMap(div);
            setAmap(map);
        }

        
        setLastMapType(mapType);

    }, [props.mapType, mAmapDiv, mBmapDiv]);



    useEffect(() => {
        return function onDestroy() {
            if (bmap) {
                bmap.destroy();
            }
        }
    }, []);

    useEffect(() => {
        if (!bmap || !props.center) {
            return;
        }

        let pt = new BMapGL.Point(props.center.lng, props.center.lat);
        bmap.centerAndZoom(pt, 12);

    }, [props.center]);

    useEffect(() => {
        if (bmap && props.viewport?.length) {
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

            if (bmap?.setViewport) { // 百度地图接口
                bmap.setViewport([
                    new BMapGL.Point(left, top),
                    new BMapGL.Point(right, bottom)
                ])
            }
            
        }
    }, [props.viewport]);

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
            <div ref={mAmapDiv} className="f-fit-content" style={amapStyle} data-containerid={containerId}>&nbsp;</div>
            <div ref={mBmapDiv} className="f-fit-content" style={bmapStyle} data-containerid={containerId}>&nbsp;</div>
            <BmapContext.Provider value={bmap}>
                { props.children }
            </BmapContext.Provider>
        </>
    )
}

CommonBmap.Marker = Marker;
CommonBmap.Polyline = Polyline;

export default CommonBmap;