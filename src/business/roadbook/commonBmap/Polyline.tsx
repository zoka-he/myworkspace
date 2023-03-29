import { useContext, useEffect } from "react";
import BmapContext from "./BmapContext";

interface IPolylineProps {
    path: { lng: number, lat: number }[],
    config?: any
}

export default function(props: IPolylineProps) {

    let bmap: any = useContext(BmapContext);

    function addPolyline() {
        let { path, config } = props;

        if (!config) {
            config = {
                strokeColor: 'blue',
                strokeWeight: 4,
                strokeOpacity: 0.8
            };
        }
        
        let poly = new BMapGL.Polyline(
            path.map((ptObj: any) => new BMapGL.Point(ptObj.lng, ptObj.lat)),
            config
        );

        bmap.addOverlay(poly);
        
        return poly;
    }

    function removePolyline(poly?: any) {
        if (!poly) return;

        bmap.removeOverlay(poly);
    }

    useEffect(() => {
        if (!bmap) return;

        let polyline = addPolyline();
        return () => removePolyline(polyline);
    }, []);

    return <></>;
}
