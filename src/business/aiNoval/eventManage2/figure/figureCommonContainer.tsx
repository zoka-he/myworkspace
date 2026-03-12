import { createContext } from "react";

interface IFigureCommonContextData {
    svgSize: { width: number; height: number };
    /** 虚拟坐标系中当前视口对应的顶部偏移（以 svg 原始坐标为单位） */
    virtualTopOffset: number;
    /** 虚拟纵坐标总高度（缩放后） */
    virtualTotalHeight: number;
}

const FigureCommonContext = createContext<IFigureCommonContextData>({
    svgSize: { width: 0, height: 0 },
    virtualTopOffset: 0,
    virtualTotalHeight: 0,
});

export default FigureCommonContext;
