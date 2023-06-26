import { useContext, useEffect } from "react";
import BmapContext from "./BmapContext";

interface IMarkerProps {
    lng: number,
    lat: number,
    label?: string,
    config?: any
}

export default function(props: IMarkerProps) {

    let bmap: any = useContext(BmapContext);

    function addMarker() {
        let { lng, lat, label, config } = props;
        let overlays = [];

        let pt: any = new BMapGL.Point(lng, lat);
        let mk: any = null;
        
        if (config) {
            mk = new BMapGL.Marker(pt, config);
        } else {
            mk = new BMapGL.Marker(pt);
        }

        overlays.push(mk);

        if (label) {
            var lb: any = new BMapGL.Label(
                label, 
                {
                    position: pt, // 指定文本标注所在的地理位置
                    offset: new BMapGL.Size(15, -25) // 设置文本偏移量
                }
            );

            lb.setStyle({
                color: 'blue',
                borderRadius: '4px',
                borderColor: '#ccc',
                padding: '3px 5px',
                fontSize: '10px',
                height: '20px',
                lineHeight: '10px',
                fontFamily: '微软雅黑'
            });

            overlays.push(lb);
        }

        if (typeof bmap?.addOverlay === 'function') { // 百度地图接口
            overlays.forEach(item => bmap.addOverlay(item));
        }

        return overlays;
    }

    function removeMarker(overlays?: any[]) {
        if (!overlays?.length) return;
        if (bmap?.removeOverlay) { // 百度地图接口
            overlays.forEach(item => bmap?.removeOverlay(item));
        }
        
    }

    useEffect(() => {
        if (!bmap) return;

        let overlays = addMarker();
        return () => removeMarker(overlays);
    }, []);

    return <></>;
}
