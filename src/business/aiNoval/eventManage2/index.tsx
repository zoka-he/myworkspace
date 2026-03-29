'use client';

import { useEffect, useMemo, useState } from "react";
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
import { notifyAiNovelWriteCompleted, postAiNovelWorkerMessage, subscribeAiNovelWorker } from "../sharedWorkerBridge";

const { Text } = Typography;

export default function EventManage2() {
    const [worldviewId, setWorldviewId] = useState<number | null>(null);
    const [storyLineId, setStoryLineId] = useState<number | undefined>(undefined);
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

    useEffect(() => {
        const unsubscribe = subscribeAiNovelWorker((workerMessage) => {
            if (workerMessage.type === "EVENT_EDIT_REQUESTED") {
                const request = workerMessage.payload;
                setHasIncomingEditRequest(true);
                if (request.worldviewId) {
                    setWorldviewId(request.worldviewId);
                }
            }
            if (workerMessage.type === "STATE_SYNC" && workerMessage.payload.lastEventEditRequest) {
                const request = workerMessage.payload.lastEventEditRequest;
                setHasIncomingEditRequest(true);
                if (request.worldviewId) {
                    setWorldviewId(request.worldviewId);
                }
            }
        });

        postAiNovelWorkerMessage({ type: "GET_STATE" });
        return unsubscribe;
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
    } = useTimelineEvents(worldviewId, storyLineId, keyword);
    const filteredByKeyword = useFilteredEvents(events, keyword);
    const filteredRows = useMemo(() => {
        const stateFiltered = !stateFilter
            ? filteredByKeyword
            : filteredByKeyword.filter((item) => item.state === stateFilter);
        return [...stateFiltered].sort((a, b) => (dateSort === "desc" ? b.date - a.date : a.date - b.date));
    }, [filteredByKeyword, stateFilter, dateSort]);
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
                                    setStoryLineId(undefined);
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
                                allowClear
                                placeholder="全部故事线"
                                value={storyLineId}
                                onChange={setStoryLineId}
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
                        {hasIncomingEditRequest ? (
                            <Text type="warning" style={{ marginRight: 12 }}>
                                已收到来自总览页的事件编辑请求
                            </Text>
                        ) : null}
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