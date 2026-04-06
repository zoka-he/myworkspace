import { useContext, useMemo } from "react";
import { EventManage2DataContext } from "../context";
import FigureCommonContext from "./figureCommonContainer";
import { IChapter } from "@/src/types/IAiNoval";

const AXIS_SVG_WIDTH = 80;

export default function ChapterLabelLayer() {
    const { chapterList } = useContext(EventManage2DataContext);
    const { timelineToScreenY } = useContext(FigureCommonContext);

    const renderableChapterList = useMemo(() => {
        return chapterList.filter(chapter => {
            if (chapter.time_in_worldview == null) return false;
            return true;
        });
    }, [chapterList]);

    function renderChapterLabel(chapter: IChapter) {
        // 五边形旗标，包裹文字，尖朝右，靠右对齐
        // 旗标宽度动态根据文字内容调整，固定高度16，右边三角尖出尖部
        
        // 章节号文本
        const text = `第${chapter.chapter_number ?? chapter.id}章`;

        // 旗标参数
        const flagHeight = 16;
        const tipWidth = 8;     // 右侧三角尖的宽度
        const paddingX = 3;     // 左右内边距（缩窄 5px）

        // 估算宽度，字符约 8px（可根据实际需求调整）
        const approxCharWidth = 8;
        const textWidth = text.length * approxCharWidth;
        const flagWidth = paddingX * 2 + textWidth + tipWidth;

        // 五边形路径（右尖朝右）
        // 顺时针: 右中 -> 右下 -> 左下 -> 左上 -> 右上 -> 右中
        const h = flagHeight;
        const w = flagWidth;
        const tip = tipWidth;
        const bodyW = w - tip;

        const polygonPath = `
            M ${w} ${h / 2}
            L ${bodyW} ${h}
            L 0 ${h}
            L 0 0
            L ${bodyW} 0
            Z
        `;

        // y坐标
        const y = timelineToScreenY(chapter.time_in_worldview ?? 0);

        const x = AXIS_SVG_WIDTH - w;

        return (
            <g
                key={`chapter-flag-${chapter.id}`}
                transform={`translate(${x}, ${y - h / 2})`}
            >
                <path
                    d={polygonPath}
                    fill="#FFE066"
                    stroke="#C9A103"
                    strokeWidth={1}
                    strokeLinejoin="miter"
                    strokeLinecap="square"
                    shapeRendering="crispEdges"
                    data-chapter-id={chapter.id}
                />
                <text
                    x={bodyW / 2}
                    y={h / 2 + 1}
                    fontSize={h * 0.6}
                    fontWeight="bold"
                    fill="#7A5700"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    pointerEvents="none"
                >
                    {text}
                </text>
            </g>
        );
    }

    return (
        <g>
            {renderableChapterList.map(renderChapterLabel)}
        </g>
    )
}