import { IFactionDefData } from "@/src/types/IAiNoval";
import fetch from "@/src/fetch";

export default {
    addFaction: async (faction: IFactionDefData) => {
        const response = await fetch.post(
            '/api/aiNoval/faction', 
            faction
        );
        return response;
    },

    updateFaction: async (faction: IFactionDefData) => {
        const response = await fetch.post(
            '/api/aiNoval/faction', 
            faction,
            {
                params: {
                    id: faction.id
                }
            }
        );
        return response;
    },

    deleteFaction: async (id: number) => {
        const response = await fetch.delete(
            '/api/aiNoval/faction', 
            {
                params: {
                    id: id
                }
            }
        );
        return response;
    },

    getFactionList: async (worldViewId: number) => {
        const response = await fetch.get(
            '/api/aiNoval/faction/list', 
            {
                params: { worldViewId, limit: 200 }
            }
        );
        return response;
    },

    getFactionTree: async (worldViewId: number) => {
        const response = await fetch.get(
            '/api/aiNoval/faction/list', 
            {
                params: { worldViewId }
            }
        );

        const data = response.data as IFactionDefData[];

        // Build tree structure from flat data
        const buildTree = (items: IFactionDefData[], parentId: number | null = null): IFactionDefData[] => {
            return items
                .filter(item => item.parent_id === parentId)
                .map(item => ({
                    ...item,
                    children: buildTree(items, item.id)
                }));
        };

        response.data = buildTree(data);

        return response;
    }
}