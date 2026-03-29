'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Checkbox, Select, Space, Typography } from "antd";
import { message } from "@/src/utils/antdAppMessage";
import { createOrUpdateTimelineEvent, deleteTimelineEvent } from "@/src/api/aiNovel";
import { TimelineDateFormatter } from "@/src/business/aiNoval/common/novelDateUtils";
import WorldViewSelect from "@/src/components/aiNovel/worldviewSelect";
import EventFilters from "./components/EventFilters";
import EventTable from "./components/EventTable";
import EventEditorModal from "./components/EventEditorModal";
import { useFactions, useFilteredEvents, useLocations, useRoles, useStoryLines, useTimelineEvents, useWorldviews } from "./hooks";
import { EVENT_STATE_OPTIONS } from "./types";
import styles from "./index.module.scss";
import {
    connectAiNovelSharedWorker,
    notifyAiNovelWriteCompleted,
    postAiNovelWorkerMessage,
    subscribeAiNovelWorker,
    subscribeEventManage2BroadcastChannel,
    type EventEditRequestPayload,
} from "../sharedWorkerBridge";

const { Text } = Typography;

export default function EventManage2() {
    const [worldviewId, setWorldviewId] = useState<number | null>(null);
    /** 为空表示不按故事线过滤（等价于全选） */
    const [storyLineIds, setStoryLineIds] = useState<number[]>([]);
    const [keyword, setKeyword] = useState("");
    const [stateFilter, setStateFilter] = useState<string | undefined>(undefined);
    const [dateSort, setDateSort] = useState<"asc" | "desc">("desc");
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showLocation, setShowLocation] = useState(false);
    const [showFactions, setShowFactions] = useState(false);
    const [showRoles, setShowRoles] = useState(false);
    const [hasIncomingEditRequest, setHasIncomingEditRequest] = useState(false);

    const applyIncomingRef = useRef<(request: EventEditRequestPayload) => void>(() => {});

    applyIncomingRef.current = (request: EventEditRequestPayload) => {
        setHasIncomingEditRequest(true);
        if (request.worldviewId != null) {
            setWorldviewId(request.worldviewId);
        }
        const raw = request.eventId;
        const eid = typeof raw === "number" ? raw : Number(raw);
        if (Number.isFinite(eid) && eid > 0) {
            setEditingEventId(eid);
            setEditorOpen(true);
        }
    };

    useEffect(() => {
        connectAiNovelSharedWorker();
        postAiNovelWorkerMessage({ type: "REGISTER_TAB", payload: { role: "eventManage2" } });

        const unsubscribe = subscribeAiNovelWorker((workerMessage) => {
            if (workerMessage.type === "EVENT_EDIT_REQUESTED") {
                applyIncomingRef.current(workerMessage.payload);
            }
            if (workerMessage.type === "STATE_SYNC" && workerMessage.payload.lastEventEditRequest) {
                applyIncomingRef.current(workerMessage.payload.lastEventEditRequest);
            }
        });

        postAiNovelWorkerMessage({ type: "GET_STATE" });
        return () => {
            postAiNovelWorkerMessage({ type: "UNREGISTER_TAB" });
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        return subscribeEventManage2BroadcastChannel((payload) => {
            applyIncomingRef.current(payload);
        });
    }, []);

    const { data: worldViews = [] } = useWorldviews();
    const { data: storyLines = [] } = useStoryLines(worldviewId);
    const { data: factions = [] } = useFactions(worldviewId);
    const { data: roles = [] } = useRoles(worldviewId);
    const { data: locations = [] } = useLocations(worldviewId);
    const {
        data: events = [],
        isLoading: isLoadingEvents,
        mutate: refreshEvents,
    } = useTimelineEvents(worldviewId);
    const filteredByKeyword = useFilteredEvents(events, keyword);
    const filteredByStoryLine = useMemo(() => {
        if (!storyLineIds.length) return filteredByKeyword;
        const allow = new Set(storyLineIds);
        return filteredByKeyword.filter((item) => allow.has(item.story_line_id));
    }, [filteredByKeyword, storyLineIds]);
    const filteredRows = useMemo(() => {
        const stateFiltered = !stateFilter
            ? filteredByStoryLine
            : filteredByStoryLine.filter((item) => item.state === stateFilter);
        return [...stateFiltered].sort((a, b) => (dateSort === "desc" ? b.date - a.date : a.date - b.date));
    }, [filteredByStoryLine, stateFilter, dateSort]);
    const dateFormatter = useMemo(() => {
        const selectedWorldView = worldViews.find((item) => item.id === worldviewId);
        if (!selectedWorldView) return null;
        return TimelineDateFormatter.fromWorldViewWithExtra(selectedWorldView);
    }, [worldViews, worldviewId]);

    const formatDate = (seconds: number) => {
        if (!dateFormatter) return `${seconds}`;
        return dateFormatter.formatSecondsToDate(seconds);
    };

    const locationNameMap = useMemo(() => {
        const map = new Map<string, string>();
        locations.forEach((item) => {
            if (!item?.code) return;
            map.set(String(item.code), item.name?.trim() ? String(item.name) : String(item.code));
        });
        return map;
    }, [locations]);
    const formatLocation = (locationCode: string) => {
        if (!locationCode) return "-";
        const locationName = locationNameMap.get(String(locationCode));
        if (!locationName) return locationCode;
        if (locationName === locationCode) return locationName;
        return `${locationName}`;
    };

    return (
        <div className={styles.page}>
            <div className={styles.leftPanel}>
                <Card
                    className={styles.leftCard}
                    size="small"
                    title="筛选条件"
                >
                    <Space direction="vertical" className="w-full" size={12}>
                        <div className="flex items-center gap-2">
                            <Text>世界观：</Text>
                            <WorldViewSelect
                                size="small"
                                value={worldviewId}
                                onChange={(value) => {
                                    setWorldviewId(value);
                                    setStoryLineIds([]);
                                    setKeyword("");
                                    setStateFilter(undefined);
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Text>故事线：</Text>
                            <Select
                                size="small"
                                className="flex-1"
                                mode="multiple"
                                allowClear
                                placeholder="全部故事线"
                                value={storyLineIds}
                                onChange={(v) => setStoryLineIds(v ?? [])}
                                options={storyLines.map((item) => ({
                                    label: item.name,
                                    value: item.id,
                                }))}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Text>状态：</Text>
                            <Select
                                size="small"
                                className="flex-1"
                                allowClear
                                placeholder="全部状态"
                                value={stateFilter}
                                onChange={setStateFilter}
                                options={EVENT_STATE_OPTIONS}
                            />
                        </div>
                    </Space>
                </Card>
                <Card
                    className={styles.leftCard}
                    size="small"
                    title="列控制"
                >
                    <Space direction="vertical" size={8}>
                        <Checkbox checked={showLocation} onChange={(e) => setShowLocation(e.target.checked)}>
                            地点
                        </Checkbox>
                        <Checkbox checked={showFactions} onChange={(e) => setShowFactions(e.target.checked)}>
                            阵营
                        </Checkbox>
                        <Checkbox checked={showRoles} onChange={(e) => setShowRoles(e.target.checked)}>
                            角色
                        </Checkbox>
                    </Space>
                </Card>
            </div>

            <Card
                className={styles.rightCard}
                size="small"
                title={
                    <div>
                        {/* {hasIncomingEditRequest ? (
                            <Text type="warning" style={{ marginRight: 12 }}>
                                已收到来自总览页的事件编辑请求
                            </Text>
                        ) : null} */}
                        <EventFilters
                            keyword={keyword}
                            dateSort={dateSort}
                            canCreate={!!worldviewId}
                            loading={isLoadingEvents}
                            onKeywordChange={setKeyword}
                            onDateSortChange={setDateSort}
                            onRefresh={() => refreshEvents()}
                            onCreate={() => {
                                if (!worldviewId) {
                                    message.warning("请先选择世界观");
                                    return;
                                }
                                setEditingEventId(null);
                                setEditorOpen(true);
                            }}
                        />
                    </div>
                }
            >
                <EventTable
                    rows={filteredRows}
                    factions={factions}
                    roles={roles}
                    storyLines={storyLines}
                    loading={isLoadingEvents}
                    formatDate={formatDate}
                    formatLocation={formatLocation}
                    showLocation={showLocation}
                    showFactions={showFactions}
                    showRoles={showRoles}
                    onEdit={(row) => {
                        setEditingEventId(row.id);
                        setEditorOpen(true);
                    }}
                    onDelete={async (row) => {
                        await deleteTimelineEvent(row.id);
                        notifyAiNovelWriteCompleted({ source: "event", action: "DELETE", api: "/timelineEvent" });
                        message.success(`事件 ${row.id} 已删除`);
                        await refreshEvents();
                    }}
                />
            </Card>

            <EventEditorModal
                open={editorOpen}
                worldviewId={worldviewId}
                eventId={editingEventId}
                submitting={isSubmitting}
                onCancel={() => setEditorOpen(false)}
                onSubmit={async (values) => {
                    if (!worldviewId && !values.id) {
                        message.warning("请先选择世界观");
                        return;
                    }
                    setIsSubmitting(true);
                    try {
                        await createOrUpdateTimelineEvent(values);
                        notifyAiNovelWriteCompleted({
                            source: "event",
                            action: values.id ? "UPDATE" : "CREATE",
                            api: "/timelineEvent",
                        });
                        message.success(values.id ? "事件已更新" : "事件已创建");
                        setEditorOpen(false);
                        setEditingEventId(null);
                        await refreshEvents();
                    } finally {
                        setIsSubmitting(false);
                    }
                }}
            />
        </div>
    );
}