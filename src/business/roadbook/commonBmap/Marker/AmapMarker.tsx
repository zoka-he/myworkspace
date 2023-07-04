import { useContext, useEffect } from "react";
import type IMarkerProps from "./IMarkerProps";
import BmapContext from "../BmapContext";

export default function(props: IMarkerProps) {
    let amap: any;
    ({ amap } = useContext(BmapContext));


    function createAmapMarker() {
        if (!amap) {
            return [];
        }

        let overlays: any[] = [];

        // 添加标记点
        let marker = new AMap.Marker({
            position: [props.lng, props.lat],
        });

        let markerContent = document.createElement("div");
        markerContent.style.width = '0';
        markerContent.style.height = '0';
        markerContent.style.overflow = 'visible';

        function setDefaultIcon() {
            let markerImg = document.createElement("img");
            markerImg.src = "https://a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-red.png";
            markerImg.setAttribute('width', '24px');
            markerImg.setAttribute('height', '34px');
            markerImg.style.position = 'absolute';
            markerImg.style.left = '-12px';
            markerImg.style.top = '-34px';
            markerContent.appendChild(markerImg);
        }
        
        if (props?.config?.icon) {
            switch(typeof props.config.icon) {
                case 'string':
                case 'object':
                    if (props.config.icon instanceof SVGSVGElement) {
                        let img = props.config.icon;
                        markerContent.appendChild(img);
                    } else if (props.config.icon instanceof BMapGL.SVGSymbol) {
                        let img = props.config.icon;
                        console.debug('svg symbol', img);
                        
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
                    }
                    break;
                default:
                    setDefaultIcon();
            }
        } else {
            setDefaultIcon();
        }

        if (props.label) {
            let markLabel = document.createElement("div");
            markLabel.innerHTML = props.label;
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
        }

        marker.setContent(markerContent);

        try {
            marker.setMap(amap);
            overlays.push(marker);
            return overlays;
        } catch(e) {
            console.error(e);
            return [];
        }
    }

    function destroyAmapMarker(overlays: any[]) {
        if (!amap) {
            return;
        }

        try {
            overlays.forEach((item: any) => {
                item.setMap(null);
            })
        } catch(e) {
            console.error(e);
        }
    }

    useEffect(() => {
        let marker = createAmapMarker();

        return () => {
            destroyAmapMarker(marker);
        }
    }, []);

    return <></>;
}