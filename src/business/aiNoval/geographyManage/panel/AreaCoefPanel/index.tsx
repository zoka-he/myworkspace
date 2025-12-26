import { useEffect, useMemo, useRef } from "react";
import { useSimpleWorldviewContext } from "../../../common/SimpleWorldviewProvider";
import { useGeoData } from "../../GeoDataProvider";
import { IGeoUnionData } from "@/src/types/IAiNoval";
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

const { Text, Paragraph } = Typography;

interface IFlatGeoData {
    id: number;
    name: string;
    code: string;
    area_coef: number;
    children_area_coef: number;
}

export default function AreaCoefPanel() {
    // const { state: worldviewState } = useSimpleWorldviewContext();
    // const { state: geoDataState } = useGeoData();
    const { state: timelineState } = useSimpleTimelineProvider();


    const TerritoryEdit = useTerritoryEdit();

    // 简化的分层结构，清除了不必要的属性，只保留了name和area_coef
    // const flatGeoDataTree = useMemo(() => {
    //     return FlatGeoDataTree.fromGeoTree(geoDataState.geoTree || []);
    // }, [geoDataState.geoTree]);

    

    return (
        <SimpleTimelineProvider>
        <div>
            {/* <h1>阵营影响力设定</h1> */}
            {/* <Paragraph>共{ flatGeoDataTree.length }个地理单元树，{ FlatGeoDataTree.getDeep(flatGeoDataTree) }个层次</Paragraph> */}
            {/* <TerritoryEdit.Modal/> */}
            <Space>
                <Button type="primary" onClick={() => TerritoryEdit.open()}>添加疆域信息</Button>
            </Space>

            <Divider orientation="center" size="small">疆域示意图</Divider>

            <div className="f-fit-height" style={{ height: 'calc(100vh - 240px)' }}>
                <SimpleSvgProvider>
                    <Plot />
                </SimpleSvgProvider>
            </div>

            <TerritoryEdit.Modal/>
        </div>
        </SimpleTimelineProvider>
    )
}

// function TerritoryEdit() {
//     const { state: geoDataState } = useGeoData();
//     const { state: factionState } = useSimpleFactionContext();
//     const flatGeoDataTree = useMemo(() => {
//         return FlatGeoDataTree.fromGeoTree(geoDataState.geoTree || []);
//     }, [geoDataState.geoTree]);

//     return (
//         <Form size="small" layout="inline">
//             <Form.Item label="地理单元" name="geo_code">
//                 <TreeSelect
//                     treeData={flatGeoDataTree}
//                     fieldNames={{ label: 'name', value: 'code', children: 'children' }}
//                     placeholder="请选择地理单元"
//                     allowClear
//                 />
//             </Form.Item>
//             <Form.Item label="所属阵营" name="faction_id">
//                 <TreeSelect
//                     treeData={factionState.factionTree}
//                     fieldNames={{ label: 'title', value: 'value', children: 'children' }}
//                     placeholder="请选择所属阵营"
//                     allowClear
//                 />
//             </Form.Item>
//             <Form.Item label="持续时间">
//                 <Text>YYYY-MM-DD ~ YYYY-MM-DD</Text>
//             </Form.Item>
//             <Form.Item label="曾用别名" name="alias">
//                 <Input/>
//             </Form.Item>
//             <Button type="primary" htmlType="submit">提交</Button>
//         </Form>
//     )
// }


function Plot() {
    const svgContext = useSimpleSvg();
    if (!svgContext) return null;
    const { dimensions, svg } = svgContext;

    const { state: worldviewState } = useSimpleWorldviewContext();
    const { state: geoDataState } = useGeoData();

    // const svgRef = useRef<SVGSVGElement>(null);
    const xAxisContainerRef = useRef<SVGGElement>(null);
    const yAxisContainerRef = useRef<SVGGElement>(null);
    const factionLayerContainerRef = useRef<SVGGElement>(null);
    const pointerLayerContainerRef = useRef<SVGGElement>(null);
    const retryRenderRef = useRef(0);

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
        console.debug('d3PartitionData changed --->> ', data);
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
            console.debug('dimensions changed --->> ', dimensions);
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
            .attr('fill', 'url(#rectGradient)');

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
        const dateMin = worldviewState.worldviewData?.tl_start_seconds || 0;
        const dateMax = worldviewState.worldviewData?.te_max_seconds || 0;

        // const dateRangeMin = dateMin + (y / k / CONFIG.dataViewHeight) * (dateMax - dateMin);
        // const dataRangeMax = (1 / k) * (dateMax - dateMin) + dateRangeMin;

        const dateRangeMax = (dateMin - dateMax) / (k * CONFIG.dataViewHeight) * (0 - y) + dateMax;
        const dateRangeMin = (dateMin - dateMax) / (k * CONFIG.dataViewHeight) * (CONFIG.dataViewHeight - y) + dateMax;

        // console.debug('k', k, 'y', y, 'CONFIG.dataViewHeight', CONFIG.dataViewHeight);
        // console.debug('old ymin', 0, 'old ymax', CONFIG.dataViewHeight);
        // console.debug('new ymin', y, 'new ymax', y + k * CONFIG.dataViewHeight);
        // console.debug('new dayMin', (-y) / k * (dateMax - dateMin) / CONFIG.dataViewHeight)
        // console.debug('new dayMax', (1 - y) / k * (dateMax - dateMin)  / CONFIG.dataViewHeight)

        // console.debug('dateMin', dateMin, 'dateMax', dateMax, )
        // console.debug('dateRangeMin', dateRangeMin,'dataRangeMax', dateRangeMax,);
        
        // const intervalSize = getIntervalSize({ min: dateMin, max: dateMax }, worldviewState.worldviewData);
        const intervalSize = getIntervalSize({ min: dateRangeMin, max: dateRangeMax }, worldviewState.worldviewData);

        const yScale = d3.scaleLinear()
            // .domain([dateMax, dateMin])
            .domain([dateRangeMax, dateRangeMin])
            .range([0, CONFIG.dataViewHeight]);

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
        d3PartitionData: d3.HierarchyRectangularNode<FlatGeoDataTree>
    ) {
        if (!factionLayerContainerRef.current) return;

        const container = d3.select(factionLayerContainerRef.current)
            .attr('transform', `translate(${CONFIG.dataViewLeftMargin},0)`)
            .attr('width', dimensions.width - CONFIG.dataViewLeftMargin)
            .attr('height', CONFIG.dataViewHeight);
    }

    
    function onZoom(
        event: d3.D3ZoomEvent<SVGSVGElement, unknown>, 
        CONFIG: { 
            dataViewHeight: number,
            dataViewLeftMargin: number
        }
    ) {
        // console.debug('onDrag --->> ', event.transform, event.transform.applyY);

        // 重新计算y轴比例尺
        plotY(CONFIG, event.transform);
    }

    function onMouseMove(event: React.MouseEvent<SVGRectElement, MouseEvent>) {
        console.debug('onMouseMove --->> ', event);
    }

    useEffect(() => {
        // console.debug('dimensions changed --->> ', dimensions);
        retryRenderRef.current = 0;

        let CONFIG = {
            rectHeight: 28,
            leafRectExtraHeight: 40,
            dataViewHeight: 0,
            dataViewLeftMargin: 120,
        }

        const d3PartitionData = calculateD3PartitionData(CONFIG);
        
        // 补充数据视图的最大高度限制
        CONFIG = {
            ...CONFIG,
            dataViewHeight: dimensions.height - d3PartitionData.height * CONFIG.rectHeight - CONFIG.leafRectExtraHeight - 5,
        }


        plotX(CONFIG, d3PartitionData);
        const { yScale } = plotY(CONFIG);
        plotFactionData(CONFIG, d3PartitionData, { yScale });
        
        
        if (svg) {
            const zoom = d3.zoom<SVGSVGElement, unknown>();
            zoom.on('zoom', event => onZoom(event, CONFIG))
                .scaleExtent([1, 100])
                .translateExtent([[0, 0], [0, dimensions.height]]);
            d3.select<SVGSVGElement, unknown>(svg).call(zoom as any);
        } else {
            console.error('svg not found');
        }
        
        return () => {
            d3.select(svg).on('.zoom', null);
            // d3.select(svg).on('mousemove', null);
        };
    }, [svg, dimensions, worldviewState.worldviewData]);

    return <>
        <g className="pointer_layer" ref={pointerLayerContainerRef}></g>
        <g className="faction_layer" ref={factionLayerContainerRef}></g>
        <g className="y_axis" ref={yAxisContainerRef}></g>
        <g className="x_locations" ref={xAxisContainerRef}></g>
    </>
}
