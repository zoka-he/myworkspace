'use client';

import * as d3 from "d3";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import FigureCommonContext, { FigureCommonProvider } from "./figureCommonContainer";
import { useGeos, useTimelines } from "../hooks";
import { time } from "console";
import { useWorldViewData } from "../hooks";
import { TimelineDateFormatter } from "../../common/novelDateUtils";

interface IFigureProps {
    children?: React.ReactNode;
    showDebugLayers?: boolean;
}

export default function Figure(props: IFigureProps) {

    const svgRef = useRef<SVGSVGElement>(null);
    const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
    const [timelineList] = useTimelines();
    const [worldViewData] = useWorldViewData();

    useEffect(() => {
        if (!svgRef.current) return;

        const observer = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                setSvgSize({ width: entry.contentRect.width, height: entry.contentRect.height });
            });
        });
        observer.observe(svgRef.current);
        return () => {
            observer.disconnect();
        };

    }, []);

    // d3 缩放 + 拖拽，并限制拖拽范围不超出有效区域
    useEffect(() => {
        if (!svgRef.current) return;
        if (svgSize.width <= 0 || svgSize.height <= 0) return;

        const svgSelection = d3.select<SVGSVGElement, unknown>(svgRef.current);

        const zoomBehavior = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent([1, 1000000]) // 缩放范围可按需要调整
            // extent / translateExtent 限制拖拽和缩放的有效范围，避免把内容拖出视口之外
            .extent([[0, 0], [svgSize.width, svgSize.height]])
            .translateExtent([[0, 0], [svgSize.width, svgSize.height]])
            .on("zoom", (event) => {
                const t = event.transform;
                setZoomTransform(t);
                // 实际几何变换交给 svg 内部的元素使用此 transform
                svgSelection.selectAll<SVGGElement, unknown>("g[data-zoom-layer='true']").attr("transform", t.toString());
            });

        svgSelection.call(zoomBehavior as any);

        return () => {
            svgSelection.on(".zoom", null);
        };
    }, [svgSize.width, svgSize.height]);

    const timelineRange = useMemo(() => {
        if (!timelineList || timelineList.length === 0) {
            return [0, 1];
        }

        let baseTimeline = timelineList.find(item => item.faction_id === null);

        if (!baseTimeline) {
            baseTimeline = timelineList[0];
        }

        let start = baseTimeline.start_seconds || 0;
        let end = (worldViewData?.te_max_seconds || 1) + 3600 * 24 * 365;

        return [start, end];

    }, [timelineList, worldViewData]);

    const actualChildren = useMemo(() => {
        const children: React.ReactNode[] = [];

        if (props.showDebugLayers) {
            children.push(<DimmisionLayer key="dimmision-layer" />);
            children.push(<VirtualCoordinateLayer key="virtual-coordinate-layer" />);
        }

        if (props.children && Array.isArray(props.children)) {
            children.push(...props.children);
        } else if (props.children) {
            children.push(props.children);
        }

        return children;
    }, [props.children, props.showDebugLayers]);

    return (
        <FigureCommonProvider svgSize={svgSize} zoomTransform={zoomTransform} timelineRange={timelineRange}>
            <div className="w-full h-full flex flex-col">
                <div className="w-full h-0 flex flex-row">
                    
                </div>
                <div className="w-full flex-1 flex flex-row">
                    <svg className="h-full w-20">
                        <TimeAxisSvg />
                    </svg>
                    <svg ref={svgRef} className="flex-1 h-full">
                        {actualChildren}
                    </svg>

                    <svg className="h-full w-40">
                        {/* 在此处建立示意图标 */}
                    </svg>
                </div>
                <div className="w-full h-20 flex flex-row">
                    <svg className="h-full w-20">
                        {/* 留空 */}
                    </svg>
                    
                    <svg className="flex-1 h-full">
                        <GeoAxisSvg />
                    </svg>

                    <svg className="h-full w-40">
                        {/* 留空 */}
                    </svg>
                </div>
            </div>
        </FigureCommonProvider>
    )
}

function DimmisionLayer() {
    const { svgSize } = useContext(FigureCommonContext);
    return (
        <g>
            <text textAnchor="end" x={svgSize.width} y={12}>{svgSize.width}x{svgSize.height}</text>
        </g>
    )
}

function VirtualCoordinateLayer() {
    const { virtualTopOffset, virtualTotalHeight, svgSize } = useContext(FigureCommonContext);
    return (
        <g>
            <text textAnchor="end" x={svgSize.width - 150} y={12}>vt: {virtualTopOffset}</text>
            <text textAnchor="end" x={svgSize.width - 150} y={32}>vh: {virtualTotalHeight}</text>
        </g>
    )
}

function TimeAxisSvg() {
    const { 
        svgSize,
        virtualTopOffset, 
        virtualTotalHeight, 
        timelineToScreenY,
        timelineVisibleSeconds,
        screenYToTimeline,
    } = useContext(FigureCommonContext);
    const [timelineList] = useTimelines();
    const [worldViewData] = useWorldViewData();

    if (virtualTotalHeight <= 0) {
        return null;
    }

    const hourSeconds = (worldViewData?.tl_hour_length_in_seconds ?? 3600);
    const daySeconds = hourSeconds *  (worldViewData?.tl_day_length_in_hours ?? 24);
    const monthSeconds = daySeconds * (worldViewData?.tl_month_length_in_days ?? 30);
    const yearSeconds = monthSeconds * (worldViewData?.tl_year_length_in_months ?? 12);

    const tickSizes = [
        { trigger: 20 * hourSeconds, size: hourSeconds },
        { trigger: daySeconds, size: 2 * hourSeconds },
        { trigger: 2 * daySeconds, size: 0.5 * daySeconds },
        { trigger: 5 * daySeconds, size: daySeconds },
        { trigger: monthSeconds, size: 2 * daySeconds },
        { trigger: 2 * monthSeconds, size: 0.5 * monthSeconds },
        { trigger: 5 * monthSeconds, size: monthSeconds },
        { trigger: yearSeconds, size: 2 * monthSeconds },
        { trigger: 2 * yearSeconds, size: 4 * monthSeconds },
        { trigger: 5 * yearSeconds, size: 0.5 *yearSeconds },
        { trigger: 10 * yearSeconds, size: 1 * yearSeconds },
        { trigger: 20 * yearSeconds, size: 2 *yearSeconds },
        { trigger: 50 * yearSeconds, size: 5 * yearSeconds },
        { trigger: 100 * yearSeconds, size: 10 * yearSeconds },
        { trigger: 200 * yearSeconds, size: 20 * yearSeconds },
        { trigger: 500 * yearSeconds, size: 50 * yearSeconds },
        { trigger: 1000 * yearSeconds, size: 100 * yearSeconds },
        { trigger: 2000 * yearSeconds, size: 200 * yearSeconds },
        { trigger: 5000 * yearSeconds, size: 500 * yearSeconds },
    ]

    const tickSize = tickSizes.findLast(item => timelineVisibleSeconds >= item.trigger)?.size ?? 0;
    const minTickTime = Math.ceil(screenYToTimeline(svgSize.height) / tickSize) * tickSize;
    const maxTickTime = (Math.floor(screenYToTimeline(0) / tickSize) + 1) * tickSize;
    console.debug(minTickTime, maxTickTime);

    let tickTimes = [minTickTime];
    for (let i = minTickTime; i < maxTickTime; i += tickSize) {
        tickTimes.push(i);
        // console.debug(tickTimes);
    }
    
    const dateFormatter = TimelineDateFormatter.fromWorldViewWithExtra(worldViewData);
    
    const ticks = tickTimes.map(time => {
        const y = timelineToScreenY(time);
        const text = dateFormatter.formatSecondsToDate(time);
        
        return { y, time, text };
    });

    const epochLabel = timelineList[0]?.epoch ?? '时间';

    return (
        <g>
            {/* 轴线紧贴容器右侧 */}
            <line x1="100%" x2="100%" y1="0%" y2="100%" stroke="#999" strokeWidth={1} />
            <text x="10%" y="10" fontSize={10} fill="#666">{epochLabel}</text>
            {ticks.map((tick, idx) => (
                <g key={idx}>
                    <line
                        x1="95%"
                        x2="100%"
                        y1={`${tick.y}`}
                        y2={`${tick.y}`}
                        stroke="#999"
                        strokeWidth={0.5}
                    />
                    <text
                        x="90%"
                        y={`${tick.y}`}
                        dy="0.32em"
                        fontSize={9}
                        textAnchor="end"
                        fill="#666"
                    >
                        {tick.text}
                    </text>
                </g>
            ))}
        </g>
    );
}

function GeoAxisSvg() {
    const { svgSize } = useContext(FigureCommonContext);
    const { leafOfGeoPartitions } = useContext(FigureCommonContext);

    if (!leafOfGeoPartitions || leafOfGeoPartitions.length === 0 || svgSize.width <= 0) {
        return null;
    }

    const count = leafOfGeoPartitions.length;
    
    return (
        <g>
            {/* 轴线紧贴容器上侧，宽度按照 svgSize.width */}
            <line x1={0} x2={svgSize.width} y1={0} y2={0} stroke="#999" strokeWidth={1} />
            {leafOfGeoPartitions.map((geo, idx) => {
                const x = (geo.x0 + geo.x1) / 2;
                return (
                    <g key={geo.data.code ?? idx}>
                        <line
                            x1={x}
                            x2={x}
                            y1={0}
                            y2={6}
                            stroke="#999"
                            strokeWidth={0.5}
                        />
                        <text
                            x={x}
                            y={10}
                            fontSize={4}
                            textAnchor="start"
                            fill="#666"
                            transform={`rotate(90, ${x}, 10)`}
                            alignmentBaseline="middle"
                        >
                            {geo.data.name}
                        </text>
                    </g>
                );
            })}
        </g>
    );
}