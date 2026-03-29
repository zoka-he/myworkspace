import useSWR from "swr";
import fetch from "@/src/fetch";
import { useMemo } from "react";

/** 按世界观拉取事件列表；故事线仅在展示层筛选，不作为查询参数。 */
export function useTimelineEvents(worldviewId: number | null | undefined, limit: number = 1000) {
    const params = useMemo(
        () => ({
            worldviewId,
            limit,
        }),
        [worldviewId, limit]
    );

    return useSWR(params, async () => {
        if (!worldviewId) {
            return [];
        }

        const actualLimit = limit || 1000;
        const response = await fetch.get("/api/aiNoval/timeline/event/list", {
            params: {
                worldviewId,
                limit: actualLimit,
            },
        });
        return response.data;
    });
}