'use client';

import * as d3 from "d3";
import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import FigureCommonContext from "./figureCommonContainer";

interface IFigureProps {
    children?: React.ReactNode;
    showDebugLayers?: boolean;
}

export default function Figure(props: IFigureProps) {

    const svgRef = useRef<SVGSVGElement>(null);
    const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);

    useEffect(() => {
        if (!svgRef.current) return;

        let observer = new ResizeObserver((entries) => {
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
            .scaleExtent([1, 1000]) // 缩放范围可按需要调整
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

    const { virtualTopOffset, virtualTotalHeight } = useMemo(() => {
        if (svgSize.height <= 0) {
            return {
                virtualTopOffset: 0,
                virtualTotalHeight: 0,
            };
        }
        // screenY = contentY * k + y
        // 当 screenY = 0 时，contentY = -y / k，即当前视口顶部在原始坐标系中的位置
        const k = zoomTransform.k || 1;
        const y = zoomTransform.y || 0;
        const top = -y / k;
        const total = svgSize.height * k;
        return {
            virtualTopOffset: top,
            virtualTotalHeight: total,
        };
    }, [svgSize.height, zoomTransform]);

    const actualChildren = useMemo(() => {
        let children: React.ReactNode[] = [];

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
        <FigureCommonContext.Provider value={{ svgSize, virtualTopOffset, virtualTotalHeight }}>
            <div className="w-full h-full flex flex-col">
                <div className="w-full h-0 flex flex-row" style={{ border: '1px solid red' }}>
                    
                </div>
                <div className="w-full flex-1 flex flex-row">
                    <svg className="h-full w-40" style={{ border: '1px solid red' }}>
                        {/* 在此处建立时间轴 */}
                    </svg>
                    <svg ref={svgRef} className="flex-1 h-full" style={{ border: '1px solid red' }}>
                        {actualChildren}
                    </svg>

                    <svg className="h-full w-40" style={{ border: '1px solid red' }}>
                        {/* 在此处建立示意图标 */}
                    </svg>
                </div>
                <div className="w-full h-30 flex flex-row">
                    <svg className="h-full w-40" style={{ border: '1px solid red' }}>
                        {/* 留空 */}
                    </svg>
                    
                    <svg className="flex-1 h-full" style={{ border: '1px solid red' }}>
                        {/* 在此处建立地理轴 */}
                    </svg>

                    <svg className="h-full w-40" style={{ border: '1px solid red' }}>
                        {/* 留空 */}
                    </svg>
                </div>
            </div>
        </FigureCommonContext.Provider>
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