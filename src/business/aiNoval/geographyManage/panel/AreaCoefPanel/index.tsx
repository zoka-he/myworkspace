import { useEffect, useMemo, useRef, useState } from "react";
import { useSimpleWorldviewContext } from "../../../common/SimpleWorldviewProvider";
import { useGeoData } from "../../GeoDataProvider";
import { IFactionTerritory, IGeoUnionData } from "@/src/types/IAiNoval";
import { IGeoTreeItem } from "../../geoTree";
import { Button, Divider, Form, Input, Space, TreeSelect, Typography } from "antd";
import { FlatGeoData, FlatGeoDataTree } from "./FlatGeoData";
import * as d3 from "d3";
import SimpleSvgProvider, { useSimpleSvg } from "../../../common/SimpleSvgProvider";
import { getIntervalSize, getTickValues } from "../../../common/axisUtils";
import { TimelineDateFormatter } from "../../../common/novelDateUtils";
import { useSimpleFactionContext } from "../../../common/SimpleFactionProvider";
import useTerritoryEdit from "./territoryEdit";
import SimpleTimelineProvider, { useSimpleTimelineProvider } from "../../../common/SimpleTimelineProvider";
import { ReloadOutlined } from "@ant-design/icons";
import fetch from "@/src/fetch";
import _ from "lodash";

const { Text, Paragraph } = Typography;

interface IFlatGeoData {
    id: number;
    name: string;
    code: string;
    area_coef: number;
    children_area_coef: number;
}

export default function AreaCoefPanel() {
    const { state: worldviewState } = useSimpleWorldviewContext();
    // const { state: geoDataState } = useGeoData();
    const { state: timelineState } = useSimpleTimelineProvider();

    const TerritoryEdit = useTerritoryEdit({
        onUpdateSuccess: () => {
            onRequestUpdate();
        },
    });

    const [territoryList, setTerritoryList] = useState<IFactionTerritory[]>([]);

    async function onRequestUpdate() {
        // console.debug('onRequestUpdate --->> ');
        const response = await fetch.get('/api/aiNoval/faction/territory/list', {
            params: {
                worldview_id: worldviewState.worldviewId,
            },
        });

        setTerritoryList(response.data);
    }

    function onGeoDataClick(geoData: IFlatGeoData) {
        const data = {
            id: null,
            worldview_id: worldviewState.worldviewId,
            geo_code: geoData.code,
            faction_id: null,
            alias_name: null,
            start_date: null,
            end_date: null,
            description: null,
        }
        TerritoryEdit.open(data);
    }

    async function onTerritoryClick(territory: IFactionTerritory) {
        const data = await fetch.get('/api/aiNoval/faction/territory', {
            params: {
                id: territory.id,
            },
        });
        TerritoryEdit.open(data);
    }
    
    useEffect(() => {
        onRequestUpdate();
    }, []);

    return (
        <SimpleTimelineProvider>
        <div>
            <Space>
                <Button type="primary" onClick={() => TerritoryEdit.open()}>添加疆域信息</Button>
                <Button icon={<ReloadOutlined />} onClick={() => onRequestUpdate()}>刷新</Button>
            </Space>

            <Divider orientation="center" size="small">疆域示意图</Divider>

            <div className="f-fit-height" style={{ height: 'calc(100vh - 240px)' }}>
                <SimpleSvgProvider>
                    <Plot territoryList={territoryList} onTerritoryClick={onTerritoryClick} onGeoDataClick={onGeoDataClick} />
                </SimpleSvgProvider>
            </div>

            <TerritoryEdit.Modal/>
        </div>
        </SimpleTimelineProvider>
    )
}


interface IPlotProps {
    territoryList: IFactionTerritory[];
    onTerritoryClick: (territory: IFactionTerritory) => void;
    onGeoDataClick: (geoData: IFlatGeoData) => void;
}

function Plot(props: IPlotProps) {
    const svgContext = useSimpleSvg();
    if (!svgContext) return null;
    const { dimensions, svg } = svgContext;

    const { state: worldviewState } = useSimpleWorldviewContext();
    const { state: geoDataState } = useGeoData();
    const { state: factionState } = useSimpleFactionContext();

    // const svgRef = useRef<SVGSVGElement>(null);
    const xAxisContainerRef = useRef<SVGGElement>(null);
    const yAxisContainerRef = useRef<SVGGElement>(null);
    const yScaleRef = useRef<d3.ScaleLinear<number, number>>(null);
    const partitionDataRef = useRef<d3.HierarchyRectangularNode<FlatGeoDataTree>>(null);

    const factionLayerContainerRef = useRef<SVGGElement>(null);
    const pointerLayerContainerRef = useRef<SVGGElement>(null);
    const legendLayerContainerRef = useRef<SVGGElement>(null);
    const tooltipLayerContainerRef = useRef<SVGGElement>(null);
    const geoHintLayerContainerRef = useRef<SVGGElement>(null);
    const timeHintLayerContainerRef = useRef<SVGGElement>(null);

    // 存储颜色比例尺
    const colorScaleRef = useRef<d3.ScaleOrdinal<string, string>>(null);

    // 存储绘图数据
    const territoryDataRef = useRef<any[]>([]);

    const retryRenderRef = useRef(0);

    let CONFIG = {
        rectHeight: 28,
        leafRectExtraHeight: 40,
        dataViewHeight: 0,
        dataViewLeftMargin: 120,
    }

    // 简化的分层结构，清除了不必要的属性，只保留了name和area_coef，并去除掉没有统计意义的节点
    const flatGeoDataTree = useMemo(() => {
        return FlatGeoDataTree.fromGeoTree(geoDataState.geoTree || []);
    }, [geoDataState.geoTree]);

    // 颜色生成器
    const colorGenerator = useMemo(() => {
        let seriesCnt = flatGeoDataTree.length;
        if (seriesCnt === 1) {
            seriesCnt = flatGeoDataTree[0].flatByDeep(2).length;
        }

        return d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, seriesCnt + 1));
    }, [flatGeoDataTree]);

    // 更换为d3的标准分层结构
    const d3GeoTreeData = useMemo<d3.HierarchyNode<FlatGeoDataTree>>(() => {
        let root: FlatGeoDataTree | null = null;
        if (flatGeoDataTree.length === 1) {
            root = flatGeoDataTree[0];
        } else {
            root = new FlatGeoDataTree(
                { 
                    id: -1, 
                    name: worldviewState.worldviewData?.title || '未命名世界', 
                    code: 'worldview', 
                    area_coef: 10000, 
                    children_area_coef: 10000 
                }, 
                flatGeoDataTree
            );
        }

        
        return d3.hierarchy(root) // d3要求具有唯一树根，因此将森林转换为世界树
            .sum(d => { // 逐层汇总，计算面积系数，暂时不处理父节点的面积系数
                if (d.children?.length > 0) {
                    return 0; // 暂时不处理父节点的面积系数
                } else {
                    return d.area_coef;
                }
            }); 
    }, [flatGeoDataTree]);

    function calculateD3PartitionData(CONFIG: { rectHeight: number, dataViewLeftMargin: number }) {
        const partitionCalculator = d3.partition<FlatGeoDataTree>()
            .size([dimensions.width - CONFIG.dataViewLeftMargin, (d3GeoTreeData.height) * CONFIG.rectHeight])

        const data = partitionCalculator(d3GeoTreeData);
        // console.debug('d3PartitionData changed --->> ', data);
        return data;
    }

    function plotX(
        CONFIG: { rectHeight: number, leafRectExtraHeight: number, dataViewLeftMargin: number }, 
        d3PartitionData: d3.HierarchyRectangularNode<FlatGeoDataTree>
    ) {
        if (!svg) return;
        if (retryRenderRef.current > 10) return;

        if (dimensions.width === 0 || dimensions.height === 0) {
            retryRenderRef.current++;
            setTimeout(() => {
                plotX(CONFIG, d3PartitionData);
            }, 100);
            return;
        } else {
            // console.debug('dimensions changed --->> ', dimensions);
        }

        retryRenderRef.current = 0;

        // 创建渐变定义
        const svgSelection = d3.select(svg);
        const defsSelection = svgSelection.select('defs');
        const defs = defsSelection.empty() ? svgSelection.append('defs') : defsSelection;
        
        const gradientSelection = defs.select<SVGLinearGradientElement>('#rectGradient');
        if (gradientSelection.empty()) {
            const gradient = defs.append('linearGradient')
                .attr('id', 'rectGradient')
                .attr('x1', '0%')
                .attr('y1', '0%')
                .attr('x2', '0%')
                .attr('y2', '100%');
            
            gradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', '#d3d3d3') // 浅灰色
                .attr('stop-opacity', 1);
            
            gradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', '#ffffff') // 白色
                .attr('stop-opacity', 1);
        }

        // 计算方块的x坐标
        function rectX(d: d3.HierarchyRectangularNode<FlatGeoDataTree>) {
            return d.x0 + CONFIG.dataViewLeftMargin;
        }


        // 计算方块的y坐标
        function rectY(d: d3.HierarchyRectangularNode<FlatGeoDataTree>) {
            if ((d.children?.length ?? 0) > 0) { // 父节点，按一行高度算
                return dimensions.height - d.y0 - (d.y1 - d.y0);
            }

            const y0 = d.y0;
            const rectHeight = d.y1 - d.y0;
            let depth = d.depth;
            while (d.parent) {
                d = d.parent as d3.HierarchyRectangularNode<FlatGeoDataTree>;
            }
            let maxDepth = d.height + 1;

            return dimensions.height - y0 - rectHeight * (maxDepth - depth) - CONFIG.leafRectExtraHeight;
        }

        // 计算方块的高度
        function rectHeight(d: d3.HierarchyRectangularNode<FlatGeoDataTree>) {
            if ((d.children?.length ?? 0) > 0) { // 父节点, 保留一行
                return (d.y1 - d.y0) - 2;
            }

            // return 0;

            const rectHeight = d.y1 - d.y0;
            let depth = d.depth;
            while (d.parent) {
                d = d.parent as d3.HierarchyRectangularNode<FlatGeoDataTree>;
            }
            let maxDepth = d.height;

            return rectHeight * (maxDepth - depth + 1) - 2 + CONFIG.leafRectExtraHeight;
        }
        
        // 处理由方块构成的多排x轴
        const xAxis = d3.select(xAxisContainerRef.current);
        const cells = xAxis.selectAll('g')
            .data(d3PartitionData.descendants())    // 拍平整个树
            .join(    // 处理插入/删除
                enter => {
                    let g = enter.append('g')
                    g.append('rect')
                    g.append('text').attr('font-size', '10px').attr('fill', '#000').text(d => d.data.name);
                    return g;
                },
                update => update,
                exit => exit.remove()
            )
            .attr('transform', d => `translate(${rectX(d)},${rectY(d)})`); // 变更各组平移位置

        
        const rects = cells.selectAll('rect').data(d => d)
            .attr('width', d => Math.max(d.x1 - d.x0 - 2, 0))   // 减去1是为了让方块之间有空隙
            .attr('height', d => Math.max(rectHeight(d), 0))   // 减去1是为了让方块之间有空隙
            .attr('fill', 'url(#rectGradient)')
            .on('click', (event, d) => {
                // console.debug('x axis rect click --->> ', d);
                props.onGeoDataClick(d.data);
            }).on('mouseenter', (event, d) => {
                plotGeoHint(event, d.data);
            }).on('mouseleave', (event, d) => {
                clearGeoHint();
            });

        const text = cells.selectAll('text').data(d => d)
            .attr('x', d => 5)
            .attr('y', d => { 
                if (d.x1 - d.x0 < 20 && d.y1 - d.y0 > 20) {
                    return -4;
                } else {
                    return 15; // 预留一个em 
                }
            })
            .attr('transform', d => {
                if (d.x1 - d.x0 < 20 && d.y1 - d.y0 > 20) {
                    return 'rotate(90)';
                } else {
                    return 'rotate(0)';
                }
            })
            .attr('pointer-events', 'none')
            .text(d => d.data.name);

        text.exit().remove();

    }

    function plotY(CONFIG: { dataViewHeight: number, dataViewLeftMargin: number }, transform?: d3.ZoomTransform) {
        if (!worldviewState.worldviewData) return {};

        let x = 0, y = 0, k = 1;
        if (transform) {
            x = transform.x;
            y = transform.y;
            k = transform.k;
        }

        const container = d3.select(yAxisContainerRef.current);

        // 原始坐标轴范围
        const dateMin = worldviewState.worldviewData?.tl_start_seconds || 0;
        const dateMax = worldviewState.worldviewData?.te_max_seconds || 0;

        // 线性变换求视口坐标轴范围
        const dateRangeMax = (dateMin - dateMax) / (k * CONFIG.dataViewHeight) * (0 - y) + dateMax;
        const dateRangeMin = (dateMin - dateMax) / (k * CONFIG.dataViewHeight) * (CONFIG.dataViewHeight - y) + dateMax;

        // 计算刻度间隔
        const intervalSize = getIntervalSize({ min: dateRangeMin, max: dateRangeMax }, worldviewState.worldviewData);

        // 创建y轴比例尺
        const yScale = d3.scaleLinear()
            .domain([dateRangeMax, dateRangeMin])
            .range([0, CONFIG.dataViewHeight]);

        yScaleRef.current = yScale;

        // 创建y轴刻度
        const yAxis = d3.axisLeft(yScale)
            .tickValues(getTickValues({ min: dateRangeMin, max: dateRangeMax }, intervalSize))
            .tickFormat(d => {
                if (!worldviewState.worldviewData) {
                    return d.toString();
                }
                return TimelineDateFormatter.fromWorldViewWithExtra(worldviewState.worldviewData).formatSecondsToDate(d.valueOf());
            });

        // Fix: cast container to correct selection type to satisfy TypeScript
        (container as unknown as d3.Selection<SVGGElement, unknown, null, undefined>)
            .attr('transform', `translate(${CONFIG.dataViewLeftMargin - 5},0)`)
            .call(yAxis);

        return {
            yScale,
            yAxis,
        }
    }

    // 绘制数据
    function plotFactionData(
        CONFIG: { dataViewLeftMargin: number, dataViewHeight: number }, 
        d3PartitionData: d3.HierarchyRectangularNode<FlatGeoDataTree>,
        { yScale }: { yScale: d3.ScaleLinear<number, number> }
    ) {
        if (!factionLayerContainerRef.current) return;

        const container = d3.select(factionLayerContainerRef.current)
            .attr('transform', `translate(${CONFIG.dataViewLeftMargin},0)`)
            .attr('width', dimensions.width - CONFIG.dataViewLeftMargin)
            .attr('height', CONFIG.dataViewHeight);

        const factionIds = _.uniq(props.territoryList.map(territory => territory.faction_id));
        const colorScale = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, factionIds.length + 1));
        colorScaleRef.current = colorScale;

        const territoryData = props.territoryList.map(territory => {

            let faction_name = factionState.factionList?.find(faction => faction.id === territory.faction_id)?.name || '未知';

            let start_date = territory.start_date || worldviewState.worldviewData?.tl_start_seconds || 0;
            let end_date = territory.end_date || worldviewState.worldviewData?.te_max_seconds || 0;
            // console.debug('start_date --->> ', start_date, 'end_date --->> ', end_date);

            let partitionData = d3PartitionData.find(i => territory.geo_code === i.data.code);
            let gx = partitionData?.x0 || 0;  // 从区位数据获取矩形左边距
            let gy = yScale(end_date) || 0;  // 从时间轴获取矩形上边距，不能超过时间轴最大值
            if (gy < 0) gy = 0;
            if (gy > CONFIG.dataViewHeight) gy = CONFIG.dataViewHeight;

            let rectWidth = (partitionData?.x1 || 0) - (partitionData?.x0 || 0); // 从区位数据获取矩形宽度
            let rectY0 = yScale(end_date);
            let rectY1 = yScale(start_date);
            if (rectY0 < 0) rectY0 = 0;
            if (rectY0 > CONFIG.dataViewHeight) rectY0 = CONFIG.dataViewHeight;
            if (rectY1 < 0) rectY1 = 0;
            if (rectY1 > CONFIG.dataViewHeight) rectY1 = CONFIG.dataViewHeight;

            let rectHeight = rectY1 - rectY0;

            let isShow = rectHeight > 0;

            return {
                id: territory.id,
                name: territory.alias_name,
                faction_id: territory.faction_id,
                faction_name: faction_name,
                code: territory.geo_code,
                geo_type: territory.geo_type,
                // 补齐没有明确开头的时间区间，默认不能超过世界观的开始时间
                start_date, 
                // 补齐没有明确结尾的时间区间，默认不能超过世界观最后一个事件设定的时间
                end_date,
                description: territory.description,
                gx,
                gy,
                rectWidth,
                rectHeight,
                isShow,
                color: territory.faction_id ? colorScale(territory.faction_id.toString()) : '#ccc',
            }
        });

        territoryDataRef.current = territoryData;

        // console.debug('final territoryData --->> ', territoryData);

        const cells = container.selectAll('g')
            .data(territoryData)
            .join(
                enter => {
                    let g = enter.append('g')
                    g.append('rect')
                    // g.append('text').attr('font-size', '10px').attr('fill', '#000').text(d => d.name);
                    return g;
                },
                update => update,
                exit => exit.remove()
            )
            .attr('transform', d => `translate(${d.gx},${d.gy})`);

        const rects = cells.selectAll('rect').data(d => [d])
            .attr('width', d => Math.max(d.rectWidth, 0))
            .attr('height', d => Math.max(d.rectHeight, 0))
            .attr('fill', d => d.color)
            .on('click', (event, d) => {
                // console.debug('rect click --->> ', d);
                props.onTerritoryClick(d as unknown as IFactionTerritory);
            })
            .on('mouseenter', (event, d) => {
                // console.debug('rect mouseenter --->> ', d);
                onMouseEnterTerritoryRect(event, d);
                plotGeoHint(event, d);
            })
            .on('mouseleave', (event, d) => {
                // console.debug('rect mouseleave --->> ', d);
                onMouseLeaveTerritoryRect(event, d);
                clearGeoHint();
            })
            .on('mousemove', (event, d) => {
                // console.debug('rect mousemove --->> ', d);
                onMouseMoveTerritoryRect(event, d);
            });

        return {
            territoryData,
        }
    }

    function plotLegend(
        territoryData: { faction_id: number, faction_name: string, color: string }[],
        CONFIG: { dataViewHeight: number, dataViewLeftMargin: number }
    ) {
        if (!legendLayerContainerRef.current) return;
        // const colorScale = colorScaleRef.current;

        const container = d3.select(legendLayerContainerRef.current);
        const legendData = _.uniqBy(territoryData.map(d => {
            return {
                faction_id: d.faction_id,
                faction_name: d.faction_name,
                color: d.color,
            }
        }), d => d.faction_id);


        container.attr('transform', `translate(5, ${CONFIG.dataViewHeight + 5})`);
        container.selectAll('.legend_container')
            .data([{}]).join(
                enter => {
                    let g = enter.append('rect').attr('class', 'legend_container');
                    return g;
                },
                update => update,
                exit => exit.remove()
            )
            .attr('transform', 'translate(0, 0)')
            .attr('height', legendData.length * 16 + 5)
            .attr('width', CONFIG.dataViewLeftMargin - 10)
            .attr('fill', '#fff')
            .attr('stroke', '#000')
            .attr('stroke-width', 0.5)
            .attr('shape-rendering', 'crispEdges');

        const cells = container.selectAll('.legend_item')
            .data(legendData)
            .join(
                enter => {
                    let g = enter.append('g').attr('class', 'legend_item');
                    g.append('rect');
                    g.append('text');
                        
                    return g;
                },
                update => update,
                exit => exit.remove()
            )
            .attr('transform', (d, index) => `translate(5, ${5 + index * 16})`);

        const rects = cells.selectAll('rect').data(d => [d])
            .attr('width', 12)
            .attr('height', 12)
            .attr('fill', d => d.color)

        const text = cells.selectAll('text').data(d => [d])
            .attr('font-size', '12px')
            .attr('fill', '#000')
            .attr('transform', 'translate(14, 10)')
            .text(d => d.faction_name);
    }

    function plotTooltip(event: React.MouseEvent<SVGRectElement, MouseEvent>, d: any) {
        const tooltipLayer = d3.select(tooltipLayerContainerRef.current);

        const nodesData = d ? [d] : [];

        const dateFormatter = TimelineDateFormatter.fromWorldViewWithExtra(worldviewState.worldviewData || {});
        const formatDate = (date: number) => {
            if (date < (worldviewState.worldviewData?.te_max_seconds ?? Infinity)) {
                return dateFormatter.formatSecondsToDate(date)
            } else {
                return '持续占领中';
            }
        }
        
        const boxText = d ? 
            [
                { title: '名称', value: d?.name || geoDataState.geoData?.find(item => item.code === d.code)?.name || '' },
                { title: '所属势力', value: d?.faction_name || '' },
                { title: '开始时间', value: formatDate(d?.start_date) || '' },
                { title: '结束时间', value: formatDate(d?.end_date) || '' },
                { title: '描述', value: d?.description || '' },
            ].filter(item => item.value !== '')
            : 
            [];


        // console.debug('boxTextMaxLength --->> ', Math.max(...boxText.map(d => getTextWidth(d.title + d.value))));

        const boxWidth = Math.max(...boxText.map(d => getTextWidth(d.title + d.value))) * 10 + 10;
        const boxHeight = boxText.length * 20 + 10;


        // 计算 tooltip 框的位置
        let x = event.offsetX;
        let y = event.offsetY + 5;

        if (x + boxWidth > dimensions.width) {
            x = x - boxWidth - 10;
        }

        if (y + boxHeight > dimensions.height) {
            y = dimensions.height - boxHeight;
        }

        const transformDuration = 50;

        // 为 tooltipLayer 的位置添加补间动画
        tooltipLayer
            .interrupt() // 中断当前动画，防止动画冲突
            .transition()
            .duration(transformDuration) // 动画时长 200ms
            .ease(d3.easeCubicOut) // 缓动函数
            .attr('transform', `translate(${x}, ${y})`);

        // 绘制 tooltip 框（使用传统的 enter/update/exit 模式以便更好地控制动画）
        const tooltipBoxSelection = tooltipLayer.selectAll('.tooltip_box')
            .data(nodesData);

        // 处理 exit：先缩小动画，然后移除
        const tooltipBoxExit = tooltipBoxSelection.exit();
        tooltipBoxExit
            .interrupt()
            .transition()
            .duration(transformDuration)
            .ease(d3.easeCubicIn)
            .attr('width', 0)
            .attr('height', 0)
            .remove();

        // 处理 enter：从0开始，然后动画到目标大小
        const tooltipBoxEnter = tooltipBoxSelection.enter()
            .append('rect')
            .attr('class', 'tooltip_box')
            .attr('width', 0)
            .attr('height', 0)
            .attr('transform', `translate(5, 0)`)
            .attr('fill', '#fff')
            .attr('stroke', '#000')
            .attr('stroke-width', 1)
            .attr('shape-rendering', 'crispEdges');

        // 处理 update：合并 enter 和 update，然后添加动画
        const tooltipBox = tooltipBoxEnter.merge(tooltipBoxSelection as any)
            .attr('transform', `translate(5, 0)`)
            .attr('fill', '#fff')
            .attr('stroke', '#000')
            .attr('stroke-width', 1)
            .attr('shape-rendering', 'crispEdges');

        // 为 tooltip_box 的大小添加补间动画
        tooltipBox
            .interrupt() // 中断当前动画
            .transition()
            .duration(transformDuration)
            .ease(d3.easeCubicOut)
            .attr('width', boxWidth)
            .attr('height', boxHeight);

        tooltipLayer.selectAll('.tooltip_text')
            .data(boxText).join(
                enter => {
                    let g = enter.append('text').attr('class', 'tooltip_text');
                    return g;
                },
                update => update,
                exit => exit.remove()
            )
            .attr('transform', (d, index) => `translate(10, ${20 + index * 20})`)
            .text(d => `${d.title}: ${d.value}`);
    }

    function plotGeoHint(event: React.MouseEvent<SVGRectElement, MouseEvent>, d: any) {
        if (!geoHintLayerContainerRef.current) {
            console.debug('geoHintLayerContainerRef.current is null');
            return;
        }

        if (!yScaleRef.current) {
            console.debug('yScaleRef.current is null');
            return;
        }

        if (!partitionDataRef.current) {
            console.debug('partitionDataRef.current is null');
            return;
        }

        
        const partitionData = partitionDataRef.current.find(p => p.data.code === d.code);
        let data: any[] = [];
        if (partitionData) {
            data = [{
                x: partitionData.x0 + CONFIG.dataViewLeftMargin,
                y: 0,
                width: partitionData.x1 - partitionData.x0,
                height: yAxisContainerRef.current?.getBBox().height || 0,
            }];
        }

        console.debug('data --->> ', data);

        const container = d3.select(geoHintLayerContainerRef.current);
        const g = container.selectAll('g').data(data).join(
            enter => {
                let g = enter.append('g');
                g.append('rect').attr('fill', '#f8f8f8');
                return g;
            },
            update => update,
            exit => exit.remove()
        );
        
        // 在 rect 子元素上设置属性，数据从父元素 g 继承
        g.selectAll('rect')
            .data(d => [d]) // 从父元素 g 获取数据
            .attr('x', d => d.x)
            .attr('y', d => d.y)
            .attr('width', d => d.width)
            .attr('height', d => d.height);
    }

    function clearGeoHint() {
        if (!geoHintLayerContainerRef.current) return;

        const container = d3.select(geoHintLayerContainerRef.current);
        container.selectAll('g').data([]).join(
            enter => enter,
            update => update,
            exit => exit.remove()
        );
    }
    
    function onZoom(
        event: d3.D3ZoomEvent<SVGSVGElement, unknown>, 
    ) {
        // console.debug('onDrag --->> ', event.transform, event.transform.applyY);
        const d3PartitionData = calculateD3PartitionData(CONFIG);
        partitionDataRef.current = d3PartitionData;

        // 补充数据视图的最大高度限制
        let CONFIG_NEW = {
            ...CONFIG,
            dataViewHeight: dimensions.height - d3PartitionData.height * CONFIG.rectHeight - CONFIG.leafRectExtraHeight - 5,
        }

        // 重新计算y轴比例尺
        const { yScale } = plotY(CONFIG_NEW, event.transform);

        // 重新绘制疆域数据
        plotFactionData(CONFIG_NEW, d3PartitionData, { yScale });
    }

    function onMouseEnterTerritoryRect(event: React.MouseEvent<SVGRectElement, MouseEvent>, d_target: any) {
        const dataLayer = d3.select(factionLayerContainerRef.current);
        dataLayer.selectAll('g').selectAll('rect')
            .attr('fill', (d, i, nodes) => {
                if (nodes[i] === event.target) {
                    const hsl = d3.hsl(d.color);
                    hsl.s = 1;
                    hsl.l = 0.5;
                    return hsl.toString();
                } else if (d.faction_id === d_target.faction_id) {
                    // 将颜色变浅（降低饱和度）
                    const color = d3.color(d.color);
                    if (color) {
                        const hsl = d3.hsl(color);
                        hsl.l += 0.15; // 将亮度增加10%
                        hsl.s *= 0.5; // 将饱和度降低到原来的70%
                        return hsl.toString();
                    }
                    return d.color;
                } else {
                    return "#ccc";
                }
            });
    }

    function onMouseLeaveTerritoryRect(event: React.MouseEvent<SVGRectElement, MouseEvent>, d: any) {
        // console.debug('onMouseLeaveTerritoryRect --->> ', event);
        const dataLayer = d3.select(factionLayerContainerRef.current);
        dataLayer.selectAll('g').selectAll('rect')
            .attr('fill', d =>d.color);

        plotTooltip(event, null);
    }

    function onMouseMoveTerritoryRect(event: React.MouseEvent<SVGRectElement, MouseEvent>, d: any) {
        // console.debug('onMouseMoveTerritoryRect --->> ', event);
        plotTooltip(event, d);
    }

    function onMouseMoveSvg(event: React.MouseEvent<SVGSVGElement, MouseEvent>) {
        if (!yScaleRef.current) return;
        const { offsetY } = event;

        let data = [{
            date: yScaleRef.current.invert(offsetY),
            y: offsetY,
        }]

        // console.debug(data[0].date);

        if (offsetY < 0) data = [];

        if (yAxisContainerRef.current) {
            // console.debug('xAxisContainerRef.current --->> ', xAxisContainerRef.current.getBBox());
            let yMax = yAxisContainerRef.current.getBBox().height;
            if (offsetY > yMax) data = [];
        }
        

        const g = d3.select(timeHintLayerContainerRef.current).selectAll('g').data(data)
            .join(
                enter => {
                    let g = enter.append('g')
                        .attr('pointer-events', 'none')

                    g.append('rect')
                        .attr('width', 12)
                        .attr('height', 16)
                        .attr('fill', '#fff')
                        .attr('stroke', '#000')
                        .attr('stroke-width', 1)
                        .attr('shape-rendering', 'crispEdges')
                        .attr('x', CONFIG.dataViewLeftMargin - 14)
                        .attr('y', -8)
                        // .attr('anchor', 'end')

                    g.append('text')
                        .attr('font-size', '10px')
                        .attr('fill', '#000')
                        .attr('text-anchor', 'end')
                        .attr('dominant-baseline', 'middle')
                        .attr('x', CONFIG.dataViewLeftMargin - 14)

                    g.append('line')
                        .attr('x1', CONFIG.dataViewLeftMargin)
                        .attr('x2', dimensions.width)
                        .attr('stroke', 'yellow')
                        .attr('stroke-width', 2)
                        .attr('pointer-events', 'none')

                    return g;
                },
                update => {
                    // update 时需要更新数据绑定，确保子元素能获取到最新的数据
                    return update;
                },
                exit => exit.remove()
            );

        function formatDate(date?: number) {
            if (!_.isNumber(date)) return '';
            return TimelineDateFormatter.fromWorldViewWithExtra(worldviewState.worldviewData || {}).formatSecondsToDate(date);
        }

        // 更新 transform 和 text 内容
        // 注意：join() 方法会自动更新数据绑定，所以这里可以直接使用 d
        g.attr('transform', `translate(0, ${offsetY})`);
        
        g.selectAll('rect')
            .data(d => [d])
            .attr('x', d => CONFIG.dataViewLeftMargin - 10 - getTextWidth(formatDate(d?.date)) * 6.5)
            .attr('y', -8)
            .attr('width', d => getTextWidth(formatDate(d?.date)) * 6.5)
            .attr('height', 16)
            .attr('fill', '#fff')
            .attr('stroke', '#000')
            .attr('stroke-width', 1)
            .attr('shape-rendering', 'crispEdges');
        
        // 显式重新绑定数据到 text 元素，确保获取最新的数据
        g.selectAll('text')
            .data(d => [d]) // 显式绑定数据，确保获取父元素的最新数据
            .text(d => {
                // console.debug('d --->> ', d);
                if (!d) return '';
                return formatDate(d.date);
            });


    }

    useEffect(() => {
        // console.debug('dimensions changed --->> ', dimensions);
        retryRenderRef.current = 0;

        

        const d3PartitionData = calculateD3PartitionData(CONFIG);
        partitionDataRef.current = d3PartitionData;

        // 补充数据视图的最大高度限制
        let CONFIG_NEW = {
            ...CONFIG,
            dataViewHeight: dimensions.height - d3PartitionData.height * CONFIG.rectHeight - CONFIG.leafRectExtraHeight - 5,
        }


        plotX(CONFIG_NEW, d3PartitionData);
        const { yScale } = plotY(CONFIG_NEW);
        const { territoryData } = plotFactionData(CONFIG_NEW, d3PartitionData, { yScale });
        plotLegend(territoryData, CONFIG_NEW);
        
        
        if (svg) {
            const zoom = d3.zoom<SVGSVGElement, unknown>();
            zoom.on('zoom', event => onZoom(event))
                .scaleExtent([1, 1000])
                .translateExtent([[0, 0], [0, dimensions.height]]);
            d3.select<SVGSVGElement, unknown>(svg).call(zoom as any);
            d3.select<SVGSVGElement, unknown>(svg).on('mousemove', event => onMouseMoveSvg(event));
        } else {
            console.error('svg not found');
        }
        
        return () => {
            d3.select(svg).on('.zoom', null);
            // d3.select(svg).on('mousemove', null);
        };
    }, [svg, dimensions, worldviewState.worldviewData, props.territoryList]);

    return <>
        <g className="pointer_layer" ref={pointerLayerContainerRef}></g>
        <g className="geo_hint_layer" ref={geoHintLayerContainerRef}></g>
        <g className="faction_layer" ref={factionLayerContainerRef}></g>
        <g className="y_axis" ref={yAxisContainerRef}></g>
        <g className="x_locations" ref={xAxisContainerRef}></g>
        <g className="legend_layer" ref={legendLayerContainerRef}></g>
        <g className="tooltip_layer" ref={tooltipLayerContainerRef}></g>
        <g className="time_hint_layer" ref={timeHintLayerContainerRef}></g>
    </>
}

function getTextWidth(str: string) {

    // 中文汉字（包括基本汉字和扩展汉字）
    const chineseHanzi = (str.match(/[\u4e00-\u9fff]/g) || []).length;
    // 中文标点符号
    const chinesePunctuation = (str.match(/[\u3000-\u303f\uff00-\uffef]/g) || []).length;
    // 全角字符（包括中文全角字符和标点）
    // const fullWidthChars = (str.match(/[\uff01-\uff5e]/g) || []).length;
    // 使用Unicode属性（ES6+）
    // const usingUnicodeProperty = (str.match(/\p{Script=Han}/gu) || []).length;

    return str.length + (chineseHanzi + chinesePunctuation) * 0.5;
}
