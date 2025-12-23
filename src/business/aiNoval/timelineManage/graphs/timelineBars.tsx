import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import SimpleSvgProvider from "./SimpleSvgProvider";
import { useSimpleSvg } from "./SimpleSvgProvider";
import * as d3 from "d3";
import { useSimpleTimelineProvider } from "../../common/SimpleTimelineProvider";
import { useSimpleWorldviewContext } from "../../common/SimpleWorldviewProvider";
import { useSimpleFactionContext } from "../../common/SimpleFactionProvider";
import { ITimelineDef } from "@/src/types/IAiNoval";
import _ from "lodash";

export default function TimelineBars() {

    const { state: timelineState } = useSimpleTimelineProvider();
    const { state: worldviewState } = useSimpleWorldviewContext();
    const { state: factionState } = useSimpleFactionContext();

    const [scaleRange, setScaleRange] = useState<{ min: number; max: number }>({ min: 0, max: 0 });

    const data = useMemo(() => {
        return Array.from(timelineState.timelineList).filter(d => !!d.faction_id);
    }, [timelineState.timelineList]);

    const dateRange = useMemo(() => {
        let timelineList = Array.from(timelineState.timelineList);
        let min = Math.min(...timelineList.map(d => d.start_seconds));
        let max = Math.max(worldviewState.worldviewData?.te_max_seconds || 0, ...timelineList.map(d => d.start_seconds));
        return { min, max };
    }, [timelineState.timelineList, worldviewState.worldviewData]);

    const seriesLabels = useMemo(() => {
        return _.uniq(data.map(d => d.faction_id ?? 0))
            .filter(factionId => factionId > 0)
            .sort((a, b) => a - b)
            .map(factionId => factionState.factionList.find(f => f.id === factionId)?.name || '无阵营');
    }, [data, factionState.factionList]);


    useEffect(() => {
        setScaleRange({ min: dateRange.min, max: dateRange.max });
    }, [dateRange]);

    const dataMargin = { top: 20, right: 100, bottom: 20, left: 100 };

    return (
        <div className="f-fit-content">
            <SimpleSvgProvider>
                <ZoomControl scaleRange={scaleRange} onZoomChange={setScaleRange}>
                    <AxisLayout 
                        margin={dataMargin} 
                        dateRange={dateRange}
                        scaleRange={scaleRange}
                        seriesLabels={seriesLabels}
                    >
                        <TimelineDataSeries data={data} />
                    </AxisLayout>
                </ZoomControl>
            </SimpleSvgProvider>
        </div>
    )
}

interface IZoomControlProps {
    scaleRange: { min: number; max: number };
    onZoomChange: (scaleRange: { min: number; max: number }) => void;
    children?: React.ReactNode;
    margin?: { top?: number; right?: number; bottom?: number; left?: number };
}

function ZoomControl(props: IZoomControlProps) {
    const svgContext = useSimpleSvg();
    if (!svgContext || !svgContext.svg) {
        return null;
    }

    const { svg, dimensions } = svgContext;

    useEffect(() => {
        if (!svg) return;

        // 清除之前的缩放行为
        d3.select(svg).on('zoom', null);

        // 创建新的缩放行为
        d3.select(svg).call(
            d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.01, 40]) // 缩放范围：0.01x 到 40x
            .translateExtent([[0, 0], [dimensions.width, dimensions.height]])
            .on('zoom', (event) => {
                const transform = event.transform;
                console.debug('zoom', transform.k, transform.x, transform.y);
            })
        );
    }, [svg, dimensions]);

    return (
        props.children
    )
}



interface IAxisLayoutContext {
    margin: { top?: number; right?: number; bottom?: number; left?: number };
    x: d3.ScaleBand<number>;
    y: d3.ScaleLinear<number, number>;
}

const AxisLayoutContext = createContext<IAxisLayoutContext | null>(null);

interface IAxisLayoutProps {
    margin?: { top?: number; right?: number; bottom?: number; left?: number };
    children?: React.ReactNode; 
    seriesLabels?: string[];
    dateRange?: { min: number; max: number };
    scaleRange?: { min: number; max: number };
}

function AxisLayout(props: IAxisLayoutProps) {
    const svgContext = useSimpleSvg();
    if (!svgContext) {
        return null;
    }
    const { svg, dimensions } = svgContext;
    const gx = useRef<SVGGElement>(null);
    const gy = useRef<SVGGElement>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const margin = {
        top: props.margin?.top || 0,
        right: props.margin?.right || 0,
        bottom: props.margin?.bottom || 0,
        left: props.margin?.left || 0,
    }

    const x = useMemo(() => {
        const xDomain = props.seriesLabels?.map((label, index) => index) || [];
        return d3.scaleBand<number>().domain(xDomain).range([margin.left, dimensions.width - margin.right]).padding(0.5);
    }, [props.seriesLabels, margin, dimensions]);

    const y = useMemo(() => {
        const yRange = [props.dateRange?.min || 0, props.dateRange?.max || 0];
        return d3.scaleLinear().domain(yRange).range([dimensions.height - margin.bottom, margin.top]);
    }, [props.dateRange, margin, dimensions]);

    function handleDrawAxis() {
        if (!gx.current || !gy.current) {
            return;
        }

        // scaleBand 代表按照系列均匀排布，两侧留空
        const xAxis = d3.axisBottom(x).tickFormat((d) => props.seriesLabels?.[d] || '');
        // const yAxis = d3.axisLeft(y).tickFormat((d) => {

        d3.select(gx.current).call(xAxis);
        d3.select(gy.current).call(d3.axisLeft(y));
    }

    useEffect(() => {

        if (!gx.current || !gy.current) {
            setIsInitialized(false);
            return;
        }

        handleDrawAxis();
        setIsInitialized(true);
    }, [svg, gx, gy, dimensions]);

    return (
        <>
            <AxisLayoutContext.Provider value={{ margin, x, y }}>
                {isInitialized ? props.children : null}
            </AxisLayoutContext.Provider>
            <g ref={gx} transform={`translate(0, ${dimensions.height - margin.bottom})`}/>
            <g ref={gy} transform={`translate(${margin.left}, 0)` }/>
        </>
    )
}

interface ITimelineDataSeriesProps {
    data: ITimelineDef[];
}

function TimelineDataSeries(props: ITimelineDataSeriesProps) {
    const axisContext = useContext(AxisLayoutContext);
    const svgContext = useSimpleSvg();
    const g_bars_container = useRef<SVGGElement>(null);
    const { state: timelineState } = useSimpleTimelineProvider();
    const { state: worldviewState } = useSimpleWorldviewContext();

    if (!axisContext || !svgContext) {
        return null;
    }

    const { x, y, margin } = axisContext;
    const { svg, dimensions } = svgContext;

    const plot = useCallback(() => {
        if (!g_bars_container.current) {
            return;
        }

        const data = props.data || [];
        const groups = Array.from(d3.group(data, d => d.faction_id).values())
            .map(group => group.sort((a, b) => {
                console.debug('a', a);
                console.debug('b', b);
                return (a.start_seconds ?? 0) - (b.start_seconds ?? 0);
            }))
            .sort((a, b) => (a[0]?.faction_id ?? 0) - (b[0]?.faction_id ?? 0))
            .map((group: ITimelineDef[], groupIndex: number) => {
                return group.map((item: ITimelineDef, itemIndex: number, group: ITimelineDef[]) => {
                    const nextItem = group[itemIndex + 1];

                    // 计算持续时间
                    let duration = 0;
                    if (nextItem) {
                        duration = nextItem.start_seconds - item.start_seconds;
                    } else if (worldviewState.worldviewData?.te_max_seconds) {
                        duration = worldviewState.worldviewData?.te_max_seconds - item.start_seconds;
                    }

                    let height = Math.abs(y(item.start_seconds + duration) - y(item.start_seconds))
                    let width = x.bandwidth();

                    let x_pos = x(groupIndex);
                    let y_pos = y(item.start_seconds) - height;

                    return {
                        data: item,
                        x: x_pos,
                        y: y_pos,
                        width: width,
                        height: height,
                    }
                })
            })

        // 创建二维颜色映射：基础颜色按 faction_id，亮度按index
        const baseColorScale = d3.scaleOrdinal<number, string>()
            .domain(Array.from(new Set(data.map(d => d.faction_id ?? 0))))
            .range(d3.schemeTableau10);
        
        // y 轴范围：从顶部（margin.top）到底部（dimensions.height - margin.bottom）
        const yMin = margin.top || 0;
        const yMax = dimensions.height - (margin.bottom || 0);
        const lightnessScale = d3.scaleLinear()
            .domain([yMin, yMax])
            .range([0.6, 0.3]); // 亮度从 0.4 到 1.0

        // 二维颜色函数：根据 faction_id 和 y 位置返回颜色
        const getColor = (factionId: number, index: number): string => {
            const baseColor = baseColorScale(factionId) || d3.schemeTableau10[0];
            
            // 将基础颜色转换为 HSL，调整亮度
            const rgb = d3.rgb(baseColor);
            const hsl = d3.hsl(rgb);
            hsl.s = 0.8;
            hsl.l = hsl.l + 0.15 * (index % 2 === 0 ? 1 : -1);
            
            return hsl.toString();
        };

        console.debug('groups', groups);

        // Flatten the nested array structure
        type BarData = { data: ITimelineDef; x: number | undefined; y: number; width: number; height: number; };
        const flatData: BarData[] = groups.flat();

        const rects = d3.select(g_bars_container.current)
            .selectAll('rect')
            .data(flatData);

        rects.attr('fill', (d, i) => getColor(d.data.faction_id ?? 0, i))

        rects.enter()
            .append('rect')
            .merge(rects as any)
            .attr('fill', (d, i) => getColor(d.data.faction_id ?? 0, i))
            .attr('x', (d) => d.x ?? 0)
            .attr('y', (d) => d.y ?? 0)
            .attr('width', (d) => d.width ?? 0)
            .attr('height', (d) => d.height ?? 0);

        rects.exit().remove();

    }, [g_bars_container, x, y, dimensions]);

    useEffect(() => {
        plot();
    }, [props.data, x, y, dimensions]);

    return <g ref={g_bars_container}></g>
}

