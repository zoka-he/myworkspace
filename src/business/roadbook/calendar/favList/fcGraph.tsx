import uuid from "@/src/utils/common/uuid";
import Openweather from "@/src/utils/openweather";
import { useState } from "react";
import DayJS from 'dayjs';

interface IFcGraph {
    data?: any[]
}

export default function(props: IFcGraph) {
    let m_svg: SVGSVGElement | null = null;
    let svgStyle = {
        width: '1000px',
        height: '140px'
    }

    let [graphId, setGraphId] = useState(uuid());
    let [activeRect, setActiveRect] = useState(null);
    let [fcPos, setFcPos] = useState<null | number>(null);

    let g_dayWidth = 25;

    function renderDateText(data: any[], left: number, top: number, width: number, height: number) {
        let labels = [];
        let lines = [];
        let times = data.map(item => DayJS( item.dt * 1000));

        if (fcPos === null) { // 常规模式，全量显示
            labels.push(
                <text x={left - 8} y={top - 35}>{times[0].format('MM-DD')}</text>
            );

            for (let i = 1; i < times.length; i++) {
                if (times[i].date() !== times[i-1].date()) {
                    let iLabelX = left - 8 + i * g_dayWidth;
                    if (labels.length === 1 && iLabelX < 50) { // 这是第二个label，需要为第一个让步
                        iLabelX = 50;
                    }

                    labels.push(
                        <text x={iLabelX} y={top - 35}>{times[i].format('MM-DD')}</text>
                    );

                    lines.push(
                        <line stroke="silver" strokeWidth={0.5}
                            x1={left + g_dayWidth * (i - 0.5)} y1={top - 45}
                            x2={left + g_dayWidth * (i - 0.5)} y2={top + 100}/>
                    )
                }
            }
        } else {
            let timeStr = DayJS(data[fcPos].dt * 1000).format('MM-DD HH:mm');

            labels.push(
                <text x={left - 8 + g_dayWidth * (fcPos + 0.5)} y={top - 35}>{timeStr}</text>
            );

            lines.push(
                <line stroke="silver" strokeWidth={0.5}
                    x1={left + g_dayWidth * fcPos} y1={top - 45}
                    x2={left + g_dayWidth * fcPos} y2={top + 100}/>
            )
        }

        return [
            ...labels,
            ...lines
        ];
    }

    function renderTempText(data: any[], left: number, top: number, width: number, height: number) {
        let temps: number[] = data.map(item => item.feels_like);
        let labels: any[] = [];

        function selectClassByTemp(temp: number) {
            if (temp > 35) {
                return 'text-super-hot';
            } else if (temp > 32) {
                return 'text-hot';
            } else if (temp < 18) {
                return 'text-cold';
            } else {
                return '';
            }
        }

        if (fcPos === null) { // 常规模式
            labels = temps.map((item, index) => {
                let iTop = 35, iLeft = g_dayWidth * (index + 0.5);
                let className: string = selectClassByTemp(item);
                return <text className={className} x={iLeft} y={iTop} text-anchor="middle">{`${(item).toFixed(0)}`}</text>
            });
        } else {
            let posData = data[fcPos];
            let weatherStr = `${posData.desc} ${posData.feels_like.toFixed(1)}°C`;
            let className: string = selectClassByTemp(posData.feels_like);

            labels.push(
                <text className={className} 
                    x={left - 8 + g_dayWidth * (fcPos + 0.5)} 
                    y={top - 15}
                >{weatherStr}</text>
            );
        }

        return labels;
    }

    function onMouseEnterRect(e: any) {
        let rectid = e?.target?.dataset?.rectid || null;
        setActiveRect(rectid);
    }

    function onMouseLeaveRect(e: any) {
        let rectid = e?.target?.dataset?.rectid || null;
        if (rectid != null && activeRect === rectid) {
            setActiveRect(null);
        }
        setFcPos(null);
    }

    function onMouseMoveRect(e: any) {
        if (!m_svg) {
            setFcPos(null);
            return;
        }

        let xPos = e.clientX - m_svg.getClientRects()[0]?.x;
        if (!(xPos > 0)) {
            // 防止出现奇怪的情况
            setFcPos(null);
            return;
        }

        let newFcPos = Math.floor((xPos - 0.5) / g_dayWidth);
        if (newFcPos !== fcPos) {
            setFcPos(newFcPos);
        }
    }

    function renderIcons(data: any[], left: number, top: number, width: number, height: number) {

        let prevIcon = data[0].icon;
        let prevDesc = data[0].desc;

        let sameIconCnt = 0;
        let sameIconStart = 0;

        let sameDescCnt = 0;
        let sameDescStart = 0;

        let icons: any[] = [];
        let rects: any[] = [];

        function pushAnIcon() {
            let size = 24;
            let iTop = top + 70, iLeft = g_dayWidth * sameIconStart + g_dayWidth * sameIconCnt / 2 + 0.5;
            let href = Openweather.getIconUrl(data[sameIconStart].icon);

            icons.push(<image className="icon" href={href} x={iLeft} y={iTop} height={size} width={size}></image>);
        }

        function pushARect() {
            let iLeft = left + g_dayWidth * (sameDescStart - 0.5), iTop = top, iWidth = g_dayWidth * (sameDescCnt + 1), iHeight = height;
            let rectid = rects.length;
            let isHover = rectid == activeRect;
            let isGoodWeather = /^(晴|少云|多云)/.test(data[sameDescStart].desc);
            let isBadWeather = /^(中雨|大雨|暴雨)/.test(data[sameDescStart].desc);

            let filltype = 'none';
            if (isHover) {
                if (isGoodWeather) {
                    filltype = `url(#temp-goodweather-fill-hover-${graphId})`;
                } else if(isBadWeather) {
                    filltype = `url(#temp-badweather-fill-hover-${graphId})`;
                } else {
                    filltype = `url(#temp-gray-fill-hover-${graphId})`;
                }
                
            } else {
                let stripeId = rectid % 2;
                if (isGoodWeather) {
                    filltype = `url(#temp-goodweather-fill-normal${stripeId}-${graphId})`;
                } else if(isBadWeather) {
                    filltype = `url(#temp-badweather-fill-normal${stripeId}-${graphId})`;
                } else {
                    filltype = `url(#temp-gray-fill-normal${stripeId}-${graphId})`;
                }
            }

            rects.push(
                <rect data-rectid={rectid}
                    onMouseEnter={onMouseEnterRect}
                    onMouseLeave={onMouseLeaveRect}
                    onMouseMove={onMouseMoveRect}
                    x={iLeft} y={iTop} height={iHeight} width={iWidth} 
                    fill={filltype}
                    clipPath={`url(#temp-clippath-${graphId})`}/>
            );
        }

        // 合并同类 icon
        for (let i = 1; i < data.length; i++) {
            let icon = data[i].icon;
            let desc = data[i].desc;

            if (icon === prevIcon) {
                sameIconCnt += 1;
                sameDescCnt += 1;
            } else {
                pushAnIcon();
                sameIconCnt = 0;
                sameIconStart = i;
                prevIcon = icon;
                
                pushARect();
                sameDescCnt = 0;
                sameDescStart = i;
                prevDesc = desc;
            }
        }

        // 合并同类 desc
        // for (let i = 1; i < data.length; i++) {
        //     let desc = data[i].desc;

        //     if (desc === prevDesc) {
        //         sameDescCnt += 1;
        //     } else {
        //         pushARect();
        //         sameDescCnt = 0;
        //         sameDescStart = i;
        //         prevDesc = prevDesc;
        //     }
        // }

        pushAnIcon();
        pushARect();

        return [
            ...rects,
            ...icons,
        ]
    }

    function renderTemp(data: any[]) {
        // 定义范围
        let top = 45, left = g_dayWidth / 2, width = g_dayWidth * 39, height = 100, range = 70;
        let cold = 18, soft = 26, hot = 32, superHot = 35;
        let coldClr = '#54BAD2', hotClr = '#F4AA2D', superHotClr = '#c20000';

        // 提取温度，并计算范围
        let temps: number[] = data.map(item => item.feels_like);
        let min = Math.min(...temps), max = Math.max(...temps);
        let tempClrRatio = (superHot - cold) / (max - min);
        let tempClrSuperHotPos = (max - superHot) / (max - min) * tempClrRatio; 
        let tempClrHotPos = tempClrSuperHotPos + (superHot - hot) / (superHot - cold) * tempClrRatio; 
        let tempClrSoftPos = tempClrSuperHotPos + (superHot - soft) / (superHot - cold) * tempClrRatio; 
        let tempClrColdPos = tempClrSuperHotPos + tempClrRatio; 

        // 曲线起始位置
        let startLeft = left, startTop = top + range - range * (temps[0] - min) / (max - min);

        let getPointSlope = (item: number, index: number, arr: number[]) => {
            

            let slope = 0;
            if (index === 0) {
                let next = arr[index + 1];
                slope = (next - item) / g_dayWidth;
            } else if (index >= arr.length - 1) {
                let prev = arr[index - 1];
                slope = (item - prev) / g_dayWidth;
            } else {
                let next = arr[index + 1], prev = arr[index - 1];
                slope = (next - prev) / (2 * g_dayWidth);
            }

            if (Number.isNaN(slope)) {
                console.debug('getPointSlope', index, '=>', arr[index - 1], item, arr[index + 1], '=>', slope);
            }
            
            return slope;
        }

        // 温度曲线绘图动作
        let actions = temps.map((item: number, index: number, arr: number[]) => {
            if (index === 0) {
                return `M ${startLeft},${startTop}`;
            } else {
                let itemSlope = 5.5 * getPointSlope(item, index, arr);
                let prevSlope = 5.5 * getPointSlope(arr[index - 1], index - 1, arr);

                // let iPrevLeft = left + (index - 1) * 25;
                let iPrevTop = top + range - range * (arr[index - 1] - min) / (max - min);

                let iLeft = left + index * g_dayWidth;
                let iTop = top + range - range * (item - min) / (max - min);

                return `C ${iLeft - 16},${iPrevTop - prevSlope * 9} ${iLeft - 9},${iTop + itemSlope * 9} ${iLeft},${iTop}`;
            }
        })

        

        // 温度曲线填充遮罩层路径
        let d_tempFill = [
            ...actions,
            `L ${left + width},${top + height}`,
            `L ${left},${top + height}`,
            // `L ${startLeft},${startTop}`
        ].join(' ');

        // 温度曲线
        let d_temp = [...actions].join(' ');

        return [
            <defs>
                <clipPath id={`temp-clippath-${graphId}`}>
                    <path fill="none" stroke='none' d={d_tempFill}></path>
                </clipPath>

                <linearGradient id={`temp-gray-fill-normal0-${graphId}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="#d7d7d7"/>
                    <stop offset="100%" stop-color="#ffffff"/>
                </linearGradient>
                <linearGradient id={`temp-gray-fill-normal1-${graphId}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="#f0f0f0"/>
                    <stop offset="100%" stop-color="#ffffff"/>
                </linearGradient>
                <linearGradient id={`temp-gray-fill-hover-${graphId}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="#c7c7c7"/>
                    <stop offset="100%" stop-color="#e7e7e7"/>
                </linearGradient>

                <linearGradient id={`temp-goodweather-fill-normal0-${graphId}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="#5EEAFF"/>
                    <stop offset="100%" stop-color="#ffffff"/>
                </linearGradient>
                <linearGradient id={`temp-goodweather-fill-normal1-${graphId}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="#B4F5FF"/>
                    <stop offset="100%" stop-color="#ffffff"/>
                </linearGradient>
                <linearGradient id={`temp-goodweather-fill-hover-${graphId}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="#4ABCCD"/>
                    <stop offset="100%" stop-color="#8FEBF7"/>
                </linearGradient>

                <linearGradient id={`temp-badweather-fill-normal0-${graphId}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="#FF965E"/>
                    <stop offset="100%" stop-color="#FFE3DA"/>
                </linearGradient>
                <linearGradient id={`temp-badweather-fill-normal1-${graphId}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="#FFC2A6"/>
                    <stop offset="100%" stop-color="#FFE3DA"/>
                </linearGradient>
                <linearGradient id={`temp-badweather-fill-hover-${graphId}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="#CD734A"/>
                    <stop offset="100%" stop-color="#F7A88F"/>
                </linearGradient>

                <linearGradient id={`temp-stroke-clr-${graphId}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset={tempClrSuperHotPos} stop-color={superHotClr}/>
                    <stop offset={tempClrHotPos} stop-color={hotClr}/>
                    <stop offset={tempClrSoftPos} stop-color="silver"/>
                    <stop offset={tempClrColdPos} stop-color={coldClr}/>
                </linearGradient>
            </defs>,
            ...renderDateText(data, left, top, width, height),
            ...renderTempText(data, left, top, width, height),
            ...renderIcons(data, left, top, width, height),
            
            <path d={d_temp} fill="none" stroke={`url(#temp-stroke-clr-${graphId})`} strokeWidth={2}></path>
        ]
    }

    

    function init(comp: SVGSVGElement | null) {
        m_svg = comp;

        if (comp === null) {
            return;
        }
    }

    

    if (!props?.data?.length) {
        return <span>nbsp;</span>;
    } else {

        return (
            <svg className="m-roadplan-fcgraph" ref={comp => init(comp)} style={svgStyle}>
                { renderTemp(props.data) }
            </svg>
        );
    }
}