import { useContext, useMemo } from "react";
import { EventManage2DataContext } from "../context";
import FigureCommonContext from "./figureCommonContainer";
import { IChapter } from "@/src/types/IAiNoval";
import styles from "./ChapterRefLayer.module.scss";

export default function ChapterRefLayer() {
    const { chapterList } = useContext(EventManage2DataContext);
    const { timelineToScreenY } = useContext(FigureCommonContext);

    const renderableChapterList = useMemo(() => {
        return chapterList.filter((chapter) => chapter.time_in_worldview != null);
    }, [chapterList]);

    function renderRefLine(chapter: IChapter) {
        const y = timelineToScreenY(chapter.time_in_worldview ?? 0);
        return (
            <line
                key={`chapter-ref-${chapter.id}`}
                className={styles.chapterRefLine}
                x1="0%"
                x2="100%"
                y1={y}
                y2={y}
            />
        );
    }

    return <g>{renderableChapterList.map(renderRefLine)}</g>;
}
