import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import SimpleSvgProvider from "./SimpleSvgProvider";
import { useSimpleSvg } from "./SimpleSvgProvider";
import * as d3 from "d3";
import { useSimpleTimelineProvider } from "../../common/SimpleTimelineProvider";
import { useSimpleWorldviewContext } from "../../common/SimpleWorldviewProvider";
import { useSimpleFactionContext } from "../../common/SimpleFactionProvider";
import { ITimelineDef } from "@/src/types/IAiNoval";
import _ from "lodash";
import { TimelineDateFormatter } from "../../common/novelDateUtils";

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
                <ZoomControl 
                    scaleRange={scaleRange} 
                    onZoomChange={setScaleRange}
                    dateRange={dateRange}
                    margin={dataMargin}
                >
                    <AxisLayout 
                        margin={dataMargin} 
                        dateRange={dateRange}
                        scaleRange={scaleRange}
                        seriesLabels={seriesLabels}
                    >
                        <TimelineDataSeries data={data} />
                        <PointerLayer margin={dataMargin} data={data}/>
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
    dateRange: { min: number; max: number };
}

function ZoomControl(props: IZoomControlProps) {
    const svgContext = useSimpleSvg();
    if (!svgContext || !svgContext.svg) {
        return null;
    }

    const { svg, dimensions } = svgContext;
    const margin = props.margin || { top: 0, right: 0, bottom: 0, left: 0 };
    const baseRangeRef = useRef<{ min: number; max: number } | null>(null);
    const isZoomingRef = useRef(false);
    const onZoomChangeRef = useRef(props.onZoomChange);
    const dateRangeRef = useRef(props.dateRange);
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const isInitializedRef = useRef(false);
    const isResettingTransformRef = useRef(false);

    // 更新ref，避免在依赖数组中包含函数
    useEffect(() => {
        onZoomChangeRef.current = props.onZoomChange;
        dateRangeRef.current = props.dateRange;
    }, [props.onZoomChange, props.dateRange]);

    // 初始化baseRangeRef
    useEffect(() => {
        if (!baseRangeRef.current && props.scaleRange.min !== 0 && props.scaleRange.max !== 0) {
            baseRangeRef.current = { ...props.scaleRange };
        }
    }, [props.scaleRange]);

    useEffect(() => {
        if (!svg || (props.scaleRange.min === 0 && props.scaleRange.max === 0)) return;

        const yRange = [dimensions.height - (margin.bottom || 0), margin.top || 0];
        const yHeight = yRange[0] - yRange[1];

        // 清除之前的缩放行为
        d3.select(svg).on('.zoom', null);

        // 创建y轴缩放行为
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 100])
            .on('start', () => {
                isZoomingRef.current = true;
                // 在开始缩放时，保存当前的scaleRange作为基准
                baseRangeRef.current = { ...props.scaleRange };
                // 在开始缩放时，如果transform不是identity，先重置为identity
                // 这样每次缩放都从identity开始，但基于当前的scaleRange
                const currentTransform = d3.zoomTransform(svg);
                if (currentTransform.k !== 1 || currentTransform.x !== 0 || currentTransform.y !== 0) {
                    isResettingTransformRef.current = true;
                    // 使用requestAnimationFrame确保在事件处理完成后再重置
                    requestAnimationFrame(() => {
                        if (svg && zoomRef.current) {
                            d3.select(svg).call(zoomRef.current.transform, d3.zoomIdentity);
                            isResettingTransformRef.current = false;
                        }
                    });
                }
            })
            .on('zoom', (event) => {
                // 如果正在重置transform，跳过处理
                if (isResettingTransformRef.current) return;
                
                if (!baseRangeRef.current) return;

                const transform = event.transform;
                const k = transform.k; // 缩放比例
                const ty = transform.y; // 垂直平移（像素）

                // 获取基准范围对应的y轴比例尺
                const baseYScale = d3.scaleLinear()
                    .domain([baseRangeRef.current.min, baseRangeRef.current.max])
                    .range(yRange);

                // 计算新的范围：基于缩放比例
                const baseRange = baseRangeRef.current.max - baseRangeRef.current.min;
                const newRange = baseRange / k;

                // 使用d3的transform直接转换y坐标
                // 在y轴中，range是[bottom, top]，即[height - margin.bottom, margin.top]
                // 我们需要将transform应用到y坐标上，然后转换回数据域
                const pixelToData = baseRange / yHeight;
                
                // 直接使用transform.y，但需要根据y轴方向调整
                // transform.y正值表示向下移动，在y轴中应该显示更早的时间（更小的值）
                // 所以：ty正值 → dataOffset应该是正值 → newMin减小（使用减法）
                const dataOffset = ty * pixelToData;

                // 调试日志
                const isDragging = Math.abs(k - 1) < 0.001;
                if (event.sourceEvent) {
                    const rect = svg.getBoundingClientRect();
                    const mouseY = (event.sourceEvent as MouseEvent).clientY - rect.top;
                    console.log('mouseY:', mouseY);
                    console.log('event.type:', (event.sourceEvent as MouseEvent).type);
                }

                let newMin: number;
                let newMax: number;

                // 判断是纯拖拽还是缩放
                if (isDragging) {
                    newMin = baseRangeRef.current.min + dataOffset;
                    newMax = baseRangeRef.current.max + dataOffset;
                } else {
                    // 缩放：以鼠标位置为中心进行缩放，然后应用平移
                    let mouseY = dimensions.height / 2;
                    if (event.sourceEvent) {
                        const rect = svg.getBoundingClientRect();
                        mouseY = (event.sourceEvent as MouseEvent).clientY - rect.top;
                    }

                    // 将鼠标y坐标转换为数据值（基于基准范围）
                    const mouseDataValue = baseYScale.invert(mouseY);

                    // 以鼠标位置为中心计算新范围
                    const mouseRatio = (mouseY - yRange[1]) / yHeight;
                    // 向下拖拽（ty正值）→ dataOffset正值 → newMin增大（使用加法）
                    newMin = mouseDataValue - mouseRatio * newRange + dataOffset;
                    newMax = newMin + newRange;
                }

                // 限制在dateRange范围内
                const dateRange = dateRangeRef.current;
                if (newMin < dateRange.min) {
                    const offset = dateRange.min - newMin;
                    newMin = dateRange.min;
                    newMax = Math.min(dateRange.max, newMax + offset);
                }
                if (newMax > dateRange.max) {
                    const offset = newMax - dateRange.max;
                    newMax = dateRange.max;
                    newMin = Math.max(dateRange.min, newMin - offset);
                }

                // 确保范围有效
                if (newMin >= newMax || newMax - newMin < (dateRange.max - dateRange.min) / 10000) {
                    newMin = dateRange.min;
                    newMax = dateRange.max;
                }

                // 使用ref调用，避免触发effect重新执行
                onZoomChangeRef.current({ min: newMin, max: newMax });
            })
            .on('end', () => {
                isZoomingRef.current = false;
            });

        zoomRef.current = zoom;

        // 应用缩放行为
        d3.select(svg).call(zoom);

        // 只在首次初始化时，如果不在缩放状态，重置transform为identity
        // 这确保每次新的缩放都从identity开始，但不会在缩放过程中重置
        if (!isInitializedRef.current && !isZoomingRef.current) {
            d3.select(svg).call(zoom.transform, d3.zoomIdentity);
            isInitializedRef.current = true;
        }

    }, [svg, dimensions, margin]);

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
    const { state: worldviewState } = useSimpleWorldviewContext();
    const gx = useRef<SVGGElement>(null);
    const gy = useRef<SVGGElement>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const xAxis = useRef<d3.Axis<number> | null>(null);
    const yAxis = useRef<d3.Axis<d3.NumberValue> | null>(null);

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
        // 使用scaleRange如果存在，否则使用dateRange
        const yDomain = props.scaleRange && (props.scaleRange.min !== 0 || props.scaleRange.max !== 0)
            ? [props.scaleRange.min, props.scaleRange.max]
            : [props.dateRange?.min || 0, props.dateRange?.max || 0];
        return d3.scaleLinear().domain(yDomain)
            .range([dimensions.height - margin.bottom, margin.top])
    }, [props.scaleRange, props.dateRange, margin, dimensions]);

    // tickSize 应该是像素值，不是时间单位
    // 使用负值让 tick 线向内（朝向图表），正值向外
    // 通常使用 6 或 -6 像素
    const tickSize = 6;

    function handleDrawAxis() {
        if (!gx.current || !gy.current) {
            return;
        }

        // scaleBand 代表按照系列均匀排布，两侧留空
        xAxis.current = d3.axisBottom(x).tickFormat((d) => props.seriesLabels?.[d] || '');
        
        // 创建 y 轴
        yAxis.current = d3.axisLeft(y).tickSize(tickSize);
        
        // 设置刻度间距：可以根据需要选择以下方法之一
        
        // 方法1: 设置刻度数量（d3会自动选择合适的间隔）
        // yAxis.current.ticks(10); // 显示大约10个刻度
        
        // 方法2: 基于时间单位计算刻度值（推荐用于时间轴）
        if (worldviewState.worldviewData) {
            const {
                tl_year_length_in_months = 12,
                tl_month_length_in_days = 30,
                tl_day_length_in_hours = 24,
                tl_hour_length_in_seconds = 3600,
            } = worldviewState.worldviewData;
            
            // 计算一个时间单位（例如：年、月、日）的秒数
            const yearInSeconds = (tl_year_length_in_months || 12) * (tl_month_length_in_days || 30) * (tl_day_length_in_hours || 24) * (tl_hour_length_in_seconds || 3600);
            const monthInSeconds = (tl_month_length_in_days || 30) * (tl_day_length_in_hours || 24) * (tl_hour_length_in_seconds || 3600);
            const dayInSeconds = (tl_day_length_in_hours || 24) * (tl_hour_length_in_seconds || 3600);
            const hourInSeconds = tl_hour_length_in_seconds || 3600;
            
            // 获取当前显示范围
            const yDomain = props.scaleRange && (props.scaleRange.min !== 0 || props.scaleRange.max !== 0)
                ? [props.scaleRange.min, props.scaleRange.max]
                : [props.dateRange?.min || 0, props.dateRange?.max || 0];
            const range = yDomain[1] - yDomain[0];
            
            // 根据范围大小选择合适的刻度间隔
            // 数组从大到小排列，找到第一个小于等于 range 的间隔
            let intervalSizes: number[] = [
                yearInSeconds * 1000,
                yearInSeconds * 500,
                yearInSeconds * 200,
                yearInSeconds * 100,
                yearInSeconds * 50,
                yearInSeconds * 20,
                yearInSeconds * 10,
                yearInSeconds * 5,
                yearInSeconds * 2,
                yearInSeconds,
                yearInSeconds * 0.5,
                monthInSeconds * 2,
                monthInSeconds,
                monthInSeconds * 0.5,
                dayInSeconds * 7,
                dayInSeconds,
            ];

            // 找到最大的、小于等于 range 的间隔
            // 或者找到第一个大于 range/20 的间隔（确保刻度不会太密集）
            let tickInterval = intervalSizes.find(size => range / size >= 5 && range / size <= 20);
            
            // 如果没找到合适的，使用最接近的
            if (!tickInterval) {
                tickInterval = intervalSizes.find(size => size <= range) || intervalSizes[intervalSizes.length - 1];
            }


            if (!tickInterval) {
                yAxis.current.ticks(10);
            } else {
                // 计算刻度值：从最小值开始，按间隔递增
                const minValue = yDomain[0];
                const maxValue = yDomain[1];
                const tickValues: number[] = [];
                for (let value = Math.ceil(minValue / tickInterval) * tickInterval; value <= maxValue; value += tickInterval) {
                    tickValues.push(value);
                }
                
                // 如果刻度太少，使用 d3 的自动刻度
                if (tickValues.length < 3) {
                    yAxis.current.ticks(10);
                } else {
                    yAxis.current.tickValues(tickValues);
                }
            }
        } else {
            // 没有世界观数据，使用默认的刻度数量
            yAxis.current.ticks(10);
        }
        
        // 设置刻度格式
        yAxis.current.tickFormat((d: d3.NumberValue, i: number) => {
            console.debug('tickFormat --> d', d);
            const value = typeof d === 'number' ? d : d.valueOf();

            if (!worldviewState.worldviewData) {
                return value.toString();
            } else {
                return TimelineDateFormatter.fromWorldViewWithExtra(worldviewState.worldviewData).formatSecondsToDate(value);
            }
        });

        d3.select(gx.current).call(xAxis.current);
        d3.select(gy.current).call(yAxis.current);
    }

    useEffect(() => {

        if (!gx.current || !gy.current) {
            setIsInitialized(false);
            return;
        }

        handleDrawAxis();
        setIsInitialized(true);
    }, [svg, gx, gy, dimensions, x, y]);

    // 当 worldviewData 变化时，重新绘制轴以更新 tickFormat
    useEffect(() => {
        if (!yAxis.current || !gy.current) {
            return;
        }

        // 重新应用 yAxis 以更新 tickFormat
        d3.select(gy.current).call(yAxis.current);
        
    }, [worldviewState.worldviewData]);

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
                // console.debug('a', a);
                // console.debug('b', b);
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

                    // 计算rect的位置和大小
                    const yStart = y(item.start_seconds);
                    const yEnd = y(item.start_seconds + duration);
                    let height = Math.abs(yEnd - yStart);
                    let width = x.bandwidth();

                    let x_pos = x(groupIndex);
                    let y_pos = Math.min(yStart, yEnd);

                    // 获取可视范围的边界
                    const yMin = margin.top || 0;
                    const yMax = dimensions.height - (margin.bottom || 0);

                    // 裁剪rect，确保不超出可视范围
                    if (y_pos < yMin) {
                        const clippedHeight = height - (yMin - y_pos);
                        if (clippedHeight > 0) {
                            height = clippedHeight;
                            y_pos = yMin;
                        } else {
                            // 完全在可视范围外，跳过
                            return null;
                        }
                    }
                    if (y_pos + height > yMax) {
                        height = Math.max(0, yMax - y_pos);
                        if (height === 0) {
                            // 完全在可视范围外，跳过
                            return null;
                        }
                    }

                    // 确保rect在x轴范围内
                    if (x_pos === undefined || x_pos < 0 || x_pos + width > dimensions.width) {
                        return null;
                    }

                    return {
                        data: item,
                        clrIndex: itemIndex % 2 ? 0 : 1,
                        x: x_pos,
                        y: y_pos,
                        width: width,
                        height: height,
                    } as { data: ITimelineDef; x: number | undefined; y: number; width: number; height: number; } | null;
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

        // console.debug('groups', groups);

        // Flatten the nested array structure and filter out null values
        type BarData = { data: ITimelineDef; clrIndex: number; x: number | undefined; y: number; width: number; height: number; };
        const flatData: BarData[] = groups.flat().filter((item): item is BarData => item !== null && item.x !== undefined);

        const rects = d3.select(g_bars_container.current)
            .selectAll('rect')
            .data(flatData);

        rects.attr('fill', (d, i) => getColor(d.data.faction_id ?? 0, d.clrIndex ?? 0))

        rects.enter()
            .append('rect')
            .merge(rects as any)
            .attr('fill', (d, i) => getColor(d.data.faction_id ?? 0, d.clrIndex ?? 0))
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

interface IPointerLayerProps {
    margin: { top: number; right: number; bottom: number; left: number };
    data: ITimelineDef[];
}

function PointerLayer(props: IPointerLayerProps) {

    const axisContext = useContext(AxisLayoutContext);
    if (!axisContext) {
        return null;
    }
    const { x, y } = axisContext;
    const svgContext = useSimpleSvg();
    if (!svgContext) {
        return null;
    }
    const { svg, dimensions } = svgContext;
    const [pointerPosition, setPointerPosition] = useState({ x: 0, y: 0 });
    const g_line = useRef<SVGGElement>(null);
    const { state: factionState } = useSimpleFactionContext();

    const isShow = useMemo(() => {

        if (!dimensions) {
            console.debug('dimensions not found');
            return false;
        }

        if (pointerPosition.x < props.margin.left || pointerPosition.x > dimensions.width - props.margin.right) {
            // console.debug('pointerPosition.x not in range', pointerPosition.x, props.margin.left, dimensions.width - props.margin.right);
            return false;
        }

        if (pointerPosition.y < props.margin.top || pointerPosition.y > dimensions.height - props.margin.bottom) {
            // console.debug('pointerPosition.y not in range');
            return false;
        }

        return true;
    }, [pointerPosition, props.margin]);

    

    function unbindMouse() {
        if (!svg) {
            return;
        }

        d3.select(svg).on('mousemove', null);
    }

    function bindMouse() {
        if (!svg) {
            return;
        }

        unbindMouse();

        d3.select(svg).on('mousemove', (event) => {
            // console.debug('mousemove', event);
            setPointerPosition({ x: event.offsetX, y: event.offsetY });
        });
    }

    function plot() {
        if (!g_line.current || !dimensions) {
            return;
        }

        const line = d3.select(g_line.current)
          .selectAll('line')
          .data([pointerPosition]);

        // 使用 merge 来更新已存在的元素
        line.enter()
          .append('line')
          .attr('stroke', 'yellow')
          .attr('stroke-width', 3)
          .merge(line as any)
          .attr('x1', props.margin.left)
          .attr('y1', (d) => d.y)
          .attr('x2', dimensions.width - props.margin.right)
          .attr('y2', (d) => d.y);

        line.exit()
          .remove();

        const textData = _.uniq((props.data || []).map(d => d.faction_id)).sort((a, b) => (a ?? 0) - (b ?? 0))
        const pointer_date = y.invert(pointerPosition.y);

        
        const text = d3.select(g_line.current).selectAll('g').data(textData);

        // 新增数据，创建文本组
        const textEnter = text.enter().append('g');
        
        // 创建底部矩形
        textEnter.append('rect')
            .attr('fill', 'yellow')
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr('height', 14)

        // 创建文本
        textEnter.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .attr('fill', 'black')
            .attr('x', (_, i: number) => (x(i) ?? 0) + x.bandwidth() / 2)
            .attr('dy', -12)

        // 合并文本组
        const textMerge = text.merge(textEnter as any);

        // 更新文本组的每个text元素
        textMerge.select('text')
            .attr('y', (_, i: number) => pointerPosition.y)
            .text(faction_id => {
                const timeline = Array.from(props.data)
                    .filter(d => d.faction_id === faction_id)
                    .sort((a, b) => - a.start_seconds + b.start_seconds)
                    .find(d => d.start_seconds < pointer_date)

                if (!timeline) {
                    // console.error('找不到匹配的timeline, faction_id = ', faction_id);
                    return '';
                }

                return `${timeline.epoch}${TimelineDateFormatter.fromTimelineDef(timeline).formatSecondsToDate(pointer_date)}`;
            });

        textMerge.each(function(d, i, nodes) {
            const textEl = d3.select(nodes[i]).select('text');
            const textWidth = textEl?.node()?.getComputedTextLength();

            const rectEl = d3.select(nodes[i]).select('rect');
            rectEl.attr('width', (textWidth ?? 0) + 10);
            rectEl.attr('height', 18);
            rectEl.attr('x', (x(i) ?? 0) - textWidth / 2 + x.bandwidth() / 2 - 5);
            rectEl.attr('y', pointerPosition.y - 23);
        });


        textMerge.exit().remove();
    }

    useEffect(() => {
        if (!svg) return;
        
        bindMouse();
        return () => {
            unbindMouse();
        };
    }, [svg]);

    useEffect(() => {
        plot();
    }, [pointerPosition, dimensions, props.margin]);

    if (!isShow) {
        return null;
    }

    return <g ref={g_line}></g>
}

