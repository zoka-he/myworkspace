import type { ITimelineEvent, TimelineEventState } from "@/src/types/IAiNoval";

export interface EventManageQuery {
    worldviewId: number | null;
    storyLineId?: number;
    keyword: string;
}

export interface EventOption {
    label: string;
    value: number | string;
}

export interface EventTableRow extends ITimelineEvent {
    key: number;
}

export const EVENT_STATE_OPTIONS: { label: string; value: TimelineEventState }[] = [
    { label: "启用", value: "enabled" },
    { label: "待核实", value: "questionable" },
    { label: "尚未发生", value: "not_yet" },
    { label: "受阻", value: "blocked" },
    { label: "已关闭", value: "closed" },
];
