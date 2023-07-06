import { useContext } from "react";
import BmapContext from "../BmapContext";
import type IPolylineProps from "./IPolylineProps";
import BmapPolyline from "./BmapPolyline";
import uuid from "@/src/utils/common/uuid";
import AmapPolyline from "./AmapPolyline";

export default function(props: IPolylineProps) {

    let mapType: string, amap: any, bmap: any;
    ({ mapType, amap, bmap } = useContext(BmapContext));

    function getMapType() {
        if (bmap && (mapType === 'baidu' || !mapType)) {
            return 'baidu';
        }

        if (amap && mapType === 'gaode') {
            return 'gaode';
        }

        return null;
    }


    switch(getMapType()) {
        case 'baidu':
            return <BmapPolyline {...props} data-uuid={uuid()}/>

        case 'gaode':
            return <AmapPolyline {...props} data-uuid={uuid()}/>;

        default:
            return null;
    }
}
