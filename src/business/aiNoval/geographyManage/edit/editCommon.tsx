import { IGeoStarSystemData } from "@/src/types/IAiNoval";
import fetch from '@/src/fetch';

export interface IGeoStarSystemDataWithChildren extends IGeoStarSystemData {
    children?: IGeoStarSystemDataWithChildren[];
}

export async function loadStarSystemTree() {
    let res = await fetch.get('/api/aiNoval/geo/starSystem/list');

    let rootMap = new Map<number, IGeoStarSystemDataWithChildren>();
    res.data.forEach((item: IGeoStarSystemData, index: number, array: IGeoStarSystemData[]) => {

        if (item.parent_system_id) {
            let parent = array.find(i => i.id === item.parent_system_id) as IGeoStarSystemDataWithChildren | undefined;
            if (parent) {
                parent.children = parent.children || [];
                parent.children.push(item as IGeoStarSystemDataWithChildren);
            }
        } else {
            if (item.id) {
                rootMap.set(item.id, item as IGeoStarSystemDataWithChildren);
            }
        }
    });

    return rootMap.values().toArray();
}

export async function loadPlanetList({ worldview_id, star_system_id }: { worldview_id?: number | null, star_system_id?: number | null }) {
    let res = await fetch.get('/api/aiNoval/geo/planet/list', { params: { worldview_id, star_system_id } });
    return res.data;
}