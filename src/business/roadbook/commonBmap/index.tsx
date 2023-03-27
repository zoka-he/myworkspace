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
}

function CommonBmap(props: ICommonBmap) {
    let mBmapDiv = useRef();

    let [bmap, setBmap] = useState<any>(null);

    useEffect(() => {
        let div = mBmapDiv.current;

        if (!bmap && div) {
            console.debug('bmap容器已就绪！', div);

            let map = new BMapGL.Map(div);
            map.enableScrollWheelZoom();
            map.disableDoubleClickZoom();

            // 设置初始中心点
            let point = new BMapGL.Point(
                props.initPoint?.lng || 116.404, 
                props.initPoint?.lat || 39.915
            );
            map.centerAndZoom(point, 12);

            setBmap(map);

            // 回传map对象
            if (typeof props.onReady === 'function') {
                props.onReady(map);
            }
        }

    }, [mBmapDiv]);

    useEffect(() => {
        return function onDestroy() {
            if (bmap) {
                bmap.destroy();
            }
        }
    }, []);

    useEffect(() => {
        if (bmap && props.center) {
            let pt = new BMapGL.Point(props.center.lng, props.center.lat);
            bmap.centerAndZoom(pt, 12);
        }
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

            bmap.setViewport([
                new BMapGL.Point(left, top),
                new BMapGL.Point(right, bottom)
            ])
        }
    }, [props.viewport]);

    return (
        <>
            { /* @ts-ignore */ }
            <div ref={mBmapDiv} className="f-fit-content">&nbsp;</div>
            <BmapContext.Provider value={bmap}>
                { props.children }
            </BmapContext.Provider>
        </>
    )
}

CommonBmap.Marker = Marker;
CommonBmap.Polyline = Polyline;

export default CommonBmap;