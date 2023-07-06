import { useContext, useEffect } from "react";
import BmapContext from "../BmapContext";
import type IPolylineProps from "./IPolylineProps";

export default function(props: IPolylineProps) {

    let bmap: any;
    ({ bmap } = useContext(BmapContext));

    function addPolyline() {
        if (!bmap) {
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
            
            let poly = new BMapGL.Polyline(
                path.map((ptObj: any) => new BMapGL.Point(ptObj.lng, ptObj.lat)),
                config
            );

            bmap?.addOverlay(poly);

            return poly;
        } catch(e) {
            console.error(e);
        }
        
        
    }

    function removePolyline(poly?: any) {
        if (!poly || !bmap) return;

        try {
            bmap?.removeOverlay(poly);
        } catch(e) {
            console.error(e);
        }
    }

    useEffect(() => {
        if (!bmap) return;

        let polyline = addPolyline();
        return () => removePolyline(polyline);
    }, []);

    return <></>;
}
