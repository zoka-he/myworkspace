import { useContext, useEffect } from "react";
import type IPolylineProps from "./IPolylineProps"
import BmapContext from "../BmapContext";

export default function(props: IPolylineProps) {

    let amap: any;
    ({ amap } = useContext(BmapContext));

    function addPolyline() {
        if (!amap) {
            return;
        }

        let { path, config } = props;

        try {
            if (!config) {
                config = {
                    strokeColor: 'blue',
                    strokeWeight: 4,
                    strokeOpacity: 0.8
                };
            }
            
            // TODO 插入曲线并返回
            console.debug('path', path, config);

            let apath = path.map(item => [item.lng, item.lat]);

            let poly = new AMap.Polyline({
                ...config,
                path: apath,
                isOutline: false,
                borderWeight: 0,
                strokeStyle: "solid",
                lineJoin: 'round',
                lineCap: 'round',
                zIndex: 50,
            });

            poly.setMap(amap);

            return poly;

        } catch(e) {
            console.error(e);
        }
        
        
    }

    function removePolyline(poly?: any) {
        if (!poly || !amap) return;

        try {
            //TODO 删除曲线并返回
            poly.setMap(null);

        } catch(e) {
            console.error(e);
        }
    }

    useEffect(() => {
        if (!amap) return;

        let polyline = addPolyline();
        return () => removePolyline(polyline);
    }, []);

    return <></>
}