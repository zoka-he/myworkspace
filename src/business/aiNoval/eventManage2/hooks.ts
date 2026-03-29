import { useMemo } from "react";
import useSWR from "swr";
import { getFactionList, getGeoUnitOptionsForWorldState, getRoleOptionsForWorldState, getStoryLineList, getTimelineEventList, getWorldViewList } from "@/src/api/aiNovel";
import type { IFactionDefData, IRoleData, IStoryLine, ITimelineEvent, IWorldViewDataWithExtra } from "@/src/types/IAiNoval";

export function useWorldviews() {
    return useSWR(["event-manage-worldviews"], async () => {
        const response = await getWorldViewList(1, 300);
        return (response?.data ?? []) as IWorldViewDataWithExtra[];
    });
}

export function useStoryLines(worldviewId: number | null) {
    return useSWR(worldviewId ? ["event-manage-story-lines", worldviewId] : null, async () => {
        if (!worldviewId) return [];
        const response = await getStoryLineList(worldviewId);
        return (response?.data ?? []) as IStoryLine[];
    });
}

export function useFactions(worldviewId: number | null) {
    return useSWR(worldviewId ? ["event-manage-factions", worldviewId] : null, async () => {
        if (!worldviewId) return [];
        const response = await getFactionList(worldviewId, 500);
        return (response?.data ?? []) as IFactionDefData[];
    });
}

export function useRoles(worldviewId: number | null) {
    return useSWR(worldviewId ? ["event-manage-roles", worldviewId] : null, async () => {
        if (!worldviewId) return [];
        const response = await getRoleOptionsForWorldState(worldviewId);
        return (response ?? []) as IRoleData[];
    });
}

export function useLocations(worldviewId: number | null) {
    return useSWR(worldviewId ? ["event-manage-locations", worldviewId] : null, async () => {
        if (!worldviewId) return [];
        const response = await getGeoUnitOptionsForWorldState(worldviewId);
        return response ?? [];
    });
}

export function useTimelineEvents(worldviewId: number | null, storyLineId?: number, keyword?: string) {
    return useSWR(worldviewId ? ["event-manage-events", worldviewId, storyLineId] : null, async () => {
        if (!worldviewId) return [];
        const response = await getTimelineEventList(
            {
                worldview_id: worldviewId,
                story_line_id: storyLineId,
            },
            1,
            1000
        );
        const rows = (response?.data ?? []) as ITimelineEvent[];
        return rows.map((item) => normalizeTimelineEvent(item));
    }, {
        keepPreviousData: true,
    });
}

export function useFilteredEvents(events: ITimelineEvent[] | undefined, keyword: string) {
    return useMemo(() => {
        if (!events?.length) return [];
        const trimmedKeyword = keyword.trim().toLowerCase();
        if (!trimmedKeyword) return events;
        return events.filter((item) => {
            const searchable = `${item.title ?? ""}|${item.description ?? ""}|${item.location ?? ""}`.toLowerCase();
            return searchable.includes(trimmedKeyword);
        });
    }, [events, keyword]);
}

export function normalizeTimelineEvent(item: ITimelineEvent): ITimelineEvent {
    const validStates = ["enabled", "questionable", "not_yet", "blocked", "closed"];
    const rawState = item.state ?? (item as unknown as Record<string, string>).State;
    const state = typeof rawState === "string" && validStates.includes(rawState) ? rawState : "enabled";
    return {
        ...item,
        id: Number(item.id),
        date: Number(item.date ?? 0),
        title: item.title ?? "",
        description: item.description ?? "",
        location: item.location ?? "",
        faction_ids: Array.isArray(item.faction_ids) ? item.faction_ids.map(Number) : [],
        role_ids: Array.isArray(item.role_ids) ? item.role_ids.map((id) => String(id)) : [],
        story_line_id: Number(item.story_line_id ?? 0),
        worldview_id: Number(item.worldview_id ?? 0),
        state,
    };
}
