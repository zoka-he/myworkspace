import { createContext, useMemo } from "react";
import * as d3 from "d3";
import type { ZoomTransform } from "d3";
import { useGeos, useGeoTree } from "../hooks";
import { IGeoUnionData } from "@/src/types/IAiNoval";
import { IGeoTreeItem, transfromGeoUnionToGeoTree } from "@/src/business/aiNoval/common/geoDataUtil";
import { GeoPartitionTree } from "../vo/geoPartitionTree";

export interface IFigureCommonContextData {
    svgSize: { width: number; height: number };
    /** 虚拟坐标系中当前视口对应的顶部偏移（以 svg 原始坐标为单位） */
    virtualTopOffset: number;
    /** 虚拟纵坐标总高度（缩放后） */
    virtualTotalHeight: number;
    /** 虚拟 Y -> 屏幕比例（0~1，对应当前视口内的位置） */
    timelineToScreenY: (virtualY: number) => number;
    /** 屏幕比例（0~1） -> 虚拟 Y */
    screenYToTimeline: (screenRatio: number) => number;
    /** 基于 d3 的线性比例尺，domain: 虚拟 Y，range: 0~1（视口内比例） */
    yScale: d3.ScaleLinear<number, number>;
    /** 当前视口内可见的秒数 */
    timelineVisibleSeconds: number;
    /** 地理分区数据 */
    geoPartitions: d3.HierarchyRectangularNode<GeoPartitionTree>[];
    /** 获取地理分区 x 坐标 */
    getXofGeoCode: (geoCode: string) => number;
    /** 获取地理分区 x 范围 */
    getXRangeofGeoCode: (geoCode: string) => [number, number];
    /** 获取地理分区叶子节点 */
    leafOfGeoPartitions: d3.HierarchyRectangularNode<GeoPartitionTree>[];
}

const defaultScale = d3.scaleLinear<number, number>().domain([0, 1]).range([0, 1]);

const FigureCommonContext = createContext<IFigureCommonContextData>({
    svgSize: { width: 0, height: 0 },
    virtualTopOffset: 0,
    virtualTotalHeight: 0,
    timelineToScreenY: () => 0,
    screenYToTimeline: () => 0,
    yScale: defaultScale,
    timelineVisibleSeconds: 0,
    geoPartitions: [],
    getXofGeoCode: () => 0,
    getXRangeofGeoCode: () => [0, 0],
    leafOfGeoPartitions: [],
});

export default FigureCommonContext;

export interface IFigureCommonProviderProps {
    svgSize: { width: number; height: number };
    zoomTransform: ZoomTransform;
    timelineRange: [number, number];
    children: React.ReactNode;
}

export function FigureCommonProvider(props: IFigureCommonProviderProps) {
    const { svgSize, zoomTransform, timelineRange, children } = props;
    const [geoTree] = useGeoTree();

    let virtualTopOffset = 0;
    let virtualTotalHeight = 0;
    let virtualBottomOffset = 0;

    if (svgSize.height > 0) {
        const k = zoomTransform.k || 1;
        const y = zoomTransform.y || 0;
        virtualTopOffset = y;
        virtualTotalHeight = svgSize.height * k;
        virtualBottomOffset = virtualTopOffset + virtualTotalHeight;
    }

    const yScale = d3.scaleLinear<number, number>()
        .domain(timelineRange)
        .range([virtualBottomOffset, virtualTopOffset]);

    const virtualToScreenY = (virtualY: number) => {
        return yScale(virtualY);
    };

    const screenYToVirtualY = (screenRatio: number) => {
        return yScale.invert(screenRatio);
    };

    const timelineVisibleSeconds = yScale.invert(0) - yScale.invert(svgSize.height);

    const geoPartitions = useMemo(() => geosToPartitions(geoTree, svgSize), [geoTree, svgSize]);

    const getXofGeoCode = (geoCode: string) => {
        const geoPartition = geoPartitions.find(d => d.data.code === geoCode);
        if (!geoPartition) return 0;
        return (geoPartition.x0 + geoPartition.x1) / 2;
    };

    const getXRangeofGeoCode = (geoCode: string): [number, number] => {
        const geoPartition = geoPartitions.find(d => d.data.code === geoCode);
        if (!geoPartition) return [0, 0];
        return [geoPartition.x0, geoPartition.x1];
    };

    const leafOfGeoPartitions = useMemo(() => {
        const geoPartition = geoPartitions.filter(d => d.height === 0);
        if (!geoPartition) return [];
        return geoPartition;
    }, [geoPartitions]);

    const value: IFigureCommonContextData = {
        svgSize,
        virtualTopOffset,
        virtualTotalHeight,
        timelineToScreenY: virtualToScreenY,
        screenYToTimeline: screenYToVirtualY,
        yScale,
        timelineVisibleSeconds,
        geoPartitions,
        leafOfGeoPartitions,
        getXofGeoCode,
        getXRangeofGeoCode,
    };

    return (
        <FigureCommonContext.Provider value={value}>
            {children}
        </FigureCommonContext.Provider>
    );
}

function geosToPartitions(geoTree: IGeoTreeItem<IGeoUnionData>[], svgSize: { width: number; height: number }) : d3.HierarchyRectangularNode<GeoPartitionTree>[] {
    if (!geoTree?.length) return [];
    console.debug(geoTree);

    let geoForest: GeoPartitionTree[] = GeoPartitionTree.fromGeoTree(geoTree);
    let geoRoot: GeoPartitionTree;
    if (geoForest.length === 1) {
        geoRoot = geoForest[0];
    } else if (geoForest.length > 1) {
        geoRoot = new GeoPartitionTree({
            id: -1,
            name: '世界',
            code: 'world',
        }, geoForest);
    } else {
        return [];
    }

    const hierarchy = d3.hierarchy(geoRoot).sum(d => 1);
    console.debug(hierarchy);
    const partitions = d3.partition<GeoPartitionTree>()
        .size([svgSize.width, svgSize.height])
        (hierarchy);
    console.debug(partitions);
    const final = partitions.descendants();
    console.debug(final);
    return final;
}
