import fetch from '@/src/fetch';

interface IHandlers {
    onClick?: Function
}

export default class EditorAmap {

    private map: any = null;
    private onClickHandler: Function | null = null;
    private mk_nodePoints: any[];
    private mk_planRoutes: any[];
    private mk_search: any;

    constructor(divOrId: HTMLDivElement | string, handlers?: IHandlers) {

        this.mk_nodePoints = [];
        this.mk_planRoutes = [];

        this.initAmap(divOrId);

        if (handlers?.onClick) {
            this.onClickHandler = handlers.onClick;
        }
    }

    initAmap(divOrId: HTMLDivElement | string) {
        try {
            if (!this.map) {

                console.debug('init amap in', divOrId);
                if (typeof divOrId === 'string') {
                    let div = document.getElementById(divOrId);
                    console.debug('init amap in', div);
                }

                let center = [116.397428, 39.90923]; // 北京

                let map = new AMap.Map(divOrId, {
                    viewMode: '2D',  // 默认使用 2D 模式
                    zoom: 11,  //初始化地图层级
                    center
                });

                
                // 添加点击事件
                map.on('click', (e: any) => this.onClickMap(e));

                this.map = map;
                console.debug('editor amap created', map.getZoom(), map.getCenter());
            }
        } catch(e) {
            console.error(e);
        }
    }

    onClickMap(e: any) {
        console.debug('on amap click', e);

        let pt: any = {
            lng: e.lnglat.getLng(),
            lat: e.lnglat.getLat()
        };

        if (this.onClickHandler) {
            this.onClickHandler(pt);
        }
    }

    getMap() {
        return this.map;
    }

    getPointAddress(lng: number, lat: number) {
        
    }

    destroy() {
        this.map.destroy();
        this.map = null;
        console.debug('editor amap destroyed');
    }

    async drawSearch(lng: number, lat: number) {
        
        // 添加标记点
        let marker = new AMap.Marker({
            position: [lng, lat],
        });

        let markerContent = document.createElement("div");
        markerContent.style.width = '0';
        markerContent.style.height = '0';
        markerContent.style.overflow = 'visible';

        let img = new BMapGL.SVGSymbol(
            await fetch.get('/mapicons/Target.svg'),
            {
                rotation: 0,
                fillColor: 'orange',
                fillOpacity : 1,
                scale: 0.05,
                anchor: new BMapGL.Size(530, 560)
            }
        )
        
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

        marker.setContent(markerContent);

        try {
            marker.setMap(this.map);
            this.mk_search = marker;

            console.info('!!!!!!!!!!!!!!!!!!!', this);
        } catch(e) {
            console.error(e);
        }
    }

    /**
     * 在地图上画点
     * @param ptList 
     */
    drawPoints(ptList: any[]) {

        console.debug('amap drawPoints', ptList);

        // 移除搜索点
        if (this.mk_search) {
            this.mk_search.setMap(null);
            this.mk_search = undefined;
        }

        ptList.forEach(pInfo => {
            // 添加标记点
            let marker = new AMap.Marker({
                position: [pInfo.lng, pInfo.lat],
            });

            let markerContent = document.createElement("div");
            markerContent.style.width = '0';
            markerContent.style.height = '0';
            markerContent.style.overflow = 'visible';

            let markerImg = document.createElement("img");
            markerImg.src = "https://a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-red.png";
            markerImg.setAttribute('width', '24px');
            markerImg.setAttribute('height', '34px');
            markerImg.style.position = 'absolute';
            markerImg.style.left = '-12px';
            markerImg.style.top = '-34px';
            markerContent.appendChild(markerImg);
        

            let markLabel = document.createElement("div");
            markLabel.innerHTML = pInfo.addr;
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

            marker.setContent(markerContent);

            try {
                marker.setMap(this.map);

                this.mk_nodePoints.push(marker);

                console.info('!!!!!!!!!!!!!!!!!!!', this.map, { label: markLabel, icon: markerImg });
            } catch(e) {
                console.error(e);
            }
        });
    }

    clearSearch() {
        // 移除旧搜索点
        if (this.mk_search) {
            this.mk_search.setMap(null);
            this.mk_search = undefined;
        }
    }

    clearPoints() {
        // 首先移除所有的点位
        this.mk_nodePoints.forEach(item => {
            item.setMap(null);
        });
        this.mk_nodePoints = [];
    }

    centerAndZoom(lng: number, lat: number, zoom: number) {
        this.map.centerAndZoom(new BMapGL.Point(lng, lat), zoom);
    }

    adjustPoints(ptList: any[]) {

        console.debug('amap editor adjustPoints', ptList);

        if (!ptList?.length) {
            this.map.setCenter([116.397428, 39.90923]); // 北京;
            this.map.setZoom(12);
            return;
        }

        let top: number = ptList[0].lat;
        let right: number = ptList[0].lng;
        let bottom: number = ptList[0].lat;
        let left: number = ptList[0].lng;

        for (let i = 1; i < ptList.length; i++) {
            let pt = ptList[i];
            top = Math.max(top, pt.lat);
            right = Math.max(right, pt.lng);
            bottom = Math.min(bottom, pt.lat);
            left = Math.min(left, pt.lng);
        }

        let bounds = new AMap.Bounds(
            [left, top],
            [right, bottom]
        );
        this.map.setBounds(bounds);
    }
}