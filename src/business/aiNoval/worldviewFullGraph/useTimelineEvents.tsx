import useSWR from "swr";
import fetch from "@/src/fetch";
import { useMemo } from "react";

export function useTimelineEvents(
    worldviewId: number | null | undefined, 
    storyLineId: number | null | undefined, 
    limit: number = 1000
) {

    const params = useMemo(() => ({
        worldviewId,
        storyLineId,
        limit,
    }), [worldviewId, storyLineId, limit]);

    return useSWR(params, async () => {

        if (!worldviewId) {
            return [];
        }

        let actualParams: any = {
            worldviewId,
        }

        if (storyLineId) {
            actualParams.storyLineId = storyLineId;
        }

        if (!limit) {
            limit = 1000;
        }

        if (limit) {
            actualParams.limit = limit;
        }

        const response = await fetch.get('/api/aiNoval/timeline/event/list', { params });
        return response.data;
    });
}