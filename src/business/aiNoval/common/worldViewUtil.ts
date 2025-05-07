import { IWorldViewData } from "@/src/types/IAiNoval";
import fetch from "@/src/fetch";

export async function getWorldViews() {
    let resp = await fetch.get('/api/aiNoval/worldView/list', { params: { page: 1, limit: 100 } });

    let data: IWorldViewData[] = [];
    let count = 0;

    if (resp && resp.data && resp.data.length > 0) {
        data = resp.data;
    }

    count = (resp as { count?: number })?.count || 0;

    return { data, count };
}