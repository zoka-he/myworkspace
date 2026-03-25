import React from "react";
import { Card } from "antd";
import ChapterStripState, { type ChapterStripReport } from "../../ChapterStripState";

export default function StripReportCard(props: {
  stripReportList: ChapterStripReport[];
  emptyContentChapterIds: number[];
  onViewOriginal: (content: string, chapterInfo: ChapterStripReport) => void;
  onViewStripped: (content: string, chapterInfo: ChapterStripReport) => void;
}) {
  const { stripReportList, emptyContentChapterIds } = props;
  return (
    <Card size="small" title="章节缩写">
      {stripReportList.length > 0 ? (
        stripReportList.map((item, index) => (
          <div
            key={index}
            style={
              item.id != null && emptyContentChapterIds.includes(item.id)
                ? { borderLeft: "3px solid #ff4d4f", paddingLeft: 8 }
                : undefined
            }
          >
            <ChapterStripState
              {...item}
              onViewOriginal={props.onViewOriginal}
              onViewStripped={props.onViewStripped}
            />
          </div>
        ))
      ) : (
        <div>暂无待缩写内容</div>
      )}
    </Card>
  );
}

