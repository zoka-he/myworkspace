import { useContext, useEffect, useState } from "react";
import BmapContext from "../BmapContext";
import BmapMarker from "./BmapMarker";
import AmapMarker from "./AmapMarker";
import type IMarkerProps from "./IMarkerProps";
import uuid from "@/src/utils/common/uuid";

export default function(props: IMarkerProps) {

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
            return <BmapMarker {...props} data-uuid={uuid()}/>

        case 'gaode':
            return <AmapMarker {...props} data-uuid={uuid()}/>;

        default:
            return null;
    }
}
