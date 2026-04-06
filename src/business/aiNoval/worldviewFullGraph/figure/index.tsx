'use client';

import * as d3 from "d3";
import { forwardRef, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import FigureCommonContext, { FigureCommonProvider } from "./figureCommonContainer";
import { useTimelines } from "../hooks";
import { useWorldViewData } from "../hooks";
import { TimelineDateFormatter } from "../../common/novelDateUtils";
import type { IWorldViewDataWithExtra } from "@/src/types/IAiNoval";
import { FactionColorLegend, StoryLineColorLegend } from "./ColorLegend";
import TerritoryPanel from "./territoryPanel";
import GeoPanel from "./geoPanel";
import ChapterLabelLayer from "./ChapterLabelLayer";
import ChapterRefLayer from "./ChapterRefLayer";
// import { ITimelineEvent } from "@/src/types/IAiNoval";

export interface IFigureHandle {
    /**
     * 将主图纵轴视口对准 [visibleStartSeconds, visibleEndSeconds]（世界秒）：
     * 较小值对应屏幕下方，较大值对应屏幕上方。与 FigureCommonProvider 中 yScale 方向一致。
     */
    fitViewportToTimeRange: (visibleStartSeconds: number, visibleEndSeconds: number) => void;
}

interface IFigureProps {
    children?: React.ReactNode;
    showDebugLayers?: boolean;
    onShowEventTip?: (eventId: number | null, position: { clientX: number; clientY: number }) => void;
    onShowChapterTip?: (chapterId: number | null, position: { clientX: number; clientY: number }) => void;
    onEventClick?: (eventId: number) => void;
}

/** 由 timeline domain [t0,t1] 与视口高度 H 解算 d3 zoom 的 k、y（与 figureCommonContainer 中 virtualTopOffset / virtualTotalHeight 约定一致）。 */
export function computeZoomForVisibleTimeRange(
    t0: number,
    t1: number,
    viewportHeight: number,
    visibleStartSeconds: number,
    visibleEndSeconds: number,
    minK = 1,
    maxK = 1_000_000,
): { k: number; y: number } {
    const domainSpan = t1 - t0;
    const span = visibleEndSeconds - visibleStartSeconds;
    if (viewportHeight <= 0 || domainSpan <= 0 || span <= 0) {
        return { k: 1, y: 0 };
    }
    let k = domainSpan / span;
    if (k < minK) {
        return { k: minK, y: 0 };
    }
    if (k > maxK) {
        k = maxK;
    }
    const y = (viewportHeight * k * (visibleEndSeconds - t1)) / domainSpan;
    return { k, y };
}

const Figure = forwardRef<IFigureHandle, IFigureProps>(function Figure(props, ref) {

    const svgRef = useRef<SVGSVGElement>(null);
    const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const timelineRangeRef = useRef<[number, number]>([0, 1]);
    const svgSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
    const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
    const [timelineList] = useTimelines();
    const [worldViewData] = useWorldViewData();
    const [mousePosition, setMousePosition] = useState<{ offsetX: number; offsetY: number; clientX: number; clientY: number }>({ 
        offsetX: 0, 
        offsetY: 0, 
        clientX: 0, 
        clientY: 0, 
    });
    const [activeEventId, setActiveEventId] = useState<number | null>(null);
    const [activeChapterId, setActiveChapterId] = useState<number | null>(null);

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

    svgSizeRef.current = svgSize;

    // d3 缩放 + 拖拽；translateExtent 放宽以允许负向 y（视口对准某段区间时需要），并与程序化 zoom.transform 一致
    useEffect(() => {
        if (!svgRef.current) return;
        if (svgSize.width <= 0 || svgSize.height <= 0) return;

        const svgSelection = d3.select<SVGSVGElement, unknown>(svgRef.current);

        const zoomBehavior = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent([1, 1000000])
            .extent([[0, 0], [svgSize.width, svgSize.height]])
            .translateExtent([[-1e12, -1e12], [1e12, 1e12]])
            .on("zoom", (event) => {
                const t = event.transform;
                setZoomTransform(t);
                svgSelection.selectAll<SVGGElement, unknown>("g[data-zoom-layer='true']").attr("transform", t.toString());
            });

        zoomBehaviorRef.current = zoomBehavior;
        svgSelection.call(zoomBehavior as any);

        return () => {
            zoomBehaviorRef.current = null;
            svgSelection.on(".zoom", null);
        };
    }, [svgSize.width, svgSize.height]);

    const timelineRange = useMemo((): [number, number] => {
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

    timelineRangeRef.current = timelineRange;

    useImperativeHandle(ref, () => ({
        fitViewportToTimeRange: (visibleStartSeconds: number, visibleEndSeconds: number) => {
            let a = visibleStartSeconds;
            let b = visibleEndSeconds;
            if (a > b) {
                const t = a;
                a = b;
                b = t;
            }
            const el = svgRef.current;
            const zb = zoomBehaviorRef.current;
            const H = svgSizeRef.current.height;
            if (!el || !zb || H <= 0) {
                return;
            }
            const [t0, t1] = timelineRangeRef.current;
            const { k, y } = computeZoomForVisibleTimeRange(t0, t1, H, a, b);
            const transform = d3.zoomIdentity.translate(0, y).scale(k);
            zb.transform(d3.select(el), transform);
        },
    }), []);

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

    function handleMouseMove(event: React.MouseEvent<SVGSVGElement>) {
        let nativeEvent = event.nativeEvent;
        setMousePosition({ 
            offsetX: nativeEvent.offsetX, 
            offsetY: nativeEvent.offsetY, 
            clientX: nativeEvent.clientX, 
            clientY: nativeEvent.clientY, 
        });

        if ((event.target as HTMLElement).tagName === 'circle') {
            let eventId = (event.target as HTMLElement).parentElement?.dataset?.['eventId'];
            setActiveEventId(eventId ? parseInt(eventId) : null);
            
            if (eventId) {
                props.onShowEventTip?.(parseInt(eventId), { clientX: nativeEvent.clientX, clientY: nativeEvent.clientY });
            } else {
                props.onShowEventTip?.(null, { clientX: nativeEvent.clientX, clientY: nativeEvent.clientY });
            }
        } else {
            setActiveEventId(null);
            props.onShowEventTip?.(null, { clientX: nativeEvent.clientX, clientY: nativeEvent.clientY });
        }

        const chapterHolder = (event.target as HTMLElement).closest('[data-chapter-id]') as HTMLElement | null;
        const chapterIdText = chapterHolder?.dataset?.['chapterId'];
        if (chapterIdText) {
            const chapterId = parseInt(chapterIdText, 10);
            setActiveChapterId(Number.isNaN(chapterId) ? null : chapterId);
            props.onShowChapterTip?.(Number.isNaN(chapterId) ? null : chapterId, { clientX: nativeEvent.clientX, clientY: nativeEvent.clientY });
        } else {
            setActiveChapterId(null);
            props.onShowChapterTip?.(null, { clientX: nativeEvent.clientX, clientY: nativeEvent.clientY });
        }

        // console.debug('mouse move --->> ', event);
    }

    function handleMouseClick(event: React.MouseEvent<SVGSVGElement>) {
        if (activeEventId) {
            props.onEventClick?.(activeEventId);
        }
    }

    return (
        <FigureCommonProvider svgSize={svgSize} zoomTransform={zoomTransform} timelineRange={timelineRange}>
            <div className="w-full h-full flex flex-col">
                <div className="w-full h-0 flex flex-row">
                    
                </div>
                <div className="w-full flex-1 flex flex-row overflow-y-auto overflow-x-visible">
                    <svg className="h-full w-20" onMouseMove={handleMouseMove} onClick={handleMouseClick}>
                        <TimeAxisSvg />
                        <ChapterLabelLayer />
                    </svg>
                    <svg ref={svgRef} className="flex-1 h-full" onMouseMove={handleMouseMove} onClick={handleMouseClick}>
                        <ChapterRefLayer />
                        {actualChildren}
                    </svg>

                    <div className="h-full w-40 overflow-y-auto overflow-x-hidden px-2">
                        {/* 在此处建立示意图标 */}
                        <StoryLineColorLegend />
                        <FactionColorLegend />
                    </div>
                </div>
                <div className="w-full h-20 flex flex-row">
                    <svg className="h-full w-20">
                        {/* 留空 */}
                    </svg>
                    
                    <div className="flex-1 h-full">
                        <svg className="w-full h-2">
                            <GeoAxisSvg />
                        </svg>
                        <div className="w-full h-18 flex flex-row gap-2">
                            <GeoPanel className="flex-1 h-full" offsetX={mousePosition.offsetX} />
                            <TerritoryPanel className="flex-1 h-full" offsetX={mousePosition.offsetX} offsetY={mousePosition.offsetY} />
                        </div>
                    </div>

                    <svg className="h-full w-40">
                        {/* 留空 */}
                    </svg>
                </div>
            </div>
        </FigureCommonProvider>
    );
});

Figure.displayName = "Figure";

export default Figure;

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
        { trigger: 0.5 * monthSeconds, size: 2 * daySeconds },
        { trigger: monthSeconds, size: 7 * daySeconds },
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
    
    const dateFormatter = TimelineDateFormatter.fromWorldViewWithExtra(
        (worldViewData ?? {}) as IWorldViewDataWithExtra,
    );
    
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
            {/* {leafOfGeoPartitions.map((geo, idx) => {
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
            })} */}
        </g>
    );
}