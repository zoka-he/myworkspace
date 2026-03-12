import { createContext } from "react";
import * as d3 from "d3";
import type { ZoomTransform } from "d3";

export interface IFigureCommonContextData {
    svgSize: { width: number; height: number };
    /** 虚拟坐标系中当前视口对应的顶部偏移（以 svg 原始坐标为单位） */
    virtualTopOffset: number;
    /** 虚拟纵坐标总高度（缩放后） */
    virtualTotalHeight: number;
    /** 虚拟 Y -> 屏幕比例（0~1，对应当前视口内的位置） */
    virtualToScreenY: (virtualY: number) => number;
    /** 屏幕比例（0~1） -> 虚拟 Y */
    screenToVirtualY: (screenRatio: number) => number;
    /** 基于 d3 的线性比例尺，domain: 虚拟 Y，range: 0~1（视口内比例） */
    yScale: d3.ScaleLinear<number, number>;
}

const defaultScale = d3.scaleLinear<number, number>().domain([0, 1]).range([0, 1]);

const FigureCommonContext = createContext<IFigureCommonContextData>({
    svgSize: { width: 0, height: 0 },
    virtualTopOffset: 0,
    virtualTotalHeight: 0,
    virtualToScreenY: () => 0,
    screenToVirtualY: () => 0,
    yScale: defaultScale,
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

    const screenToVirtualY = (screenRatio: number) => {
        return yScale.invert(screenRatio);
    };

    const value: IFigureCommonContextData = {
        svgSize,
        virtualTopOffset,
        virtualTotalHeight,
        virtualToScreenY,
        screenToVirtualY,
        yScale,
    };

    return (
        <FigureCommonContext.Provider value={value}>
            {children}
        </FigureCommonContext.Provider>
    );
}
