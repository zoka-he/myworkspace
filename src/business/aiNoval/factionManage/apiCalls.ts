import { IFactionDefData, IFactionRelation } from "@/src/types/IAiNoval";
import fetch from "@/src/fetch";

// Build tree structure from flat data
const buildTree = (items: IFactionDefData[], parentId: number | null = null): IFactionDefData[] => {
    return items
        .filter(item => item.parent_id === parentId)
        .map(item => ({
            ...item,
            children: buildTree(items, item.id)
        }));
};

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
                params: { worldview_id: worldViewId, limit: 200 }
            }
        );
        return response;
    },

    convertFactionListToTree: (items: IFactionDefData[]): IFactionDefData[] => {
        if (!items || items.length === 0) return [];
        return buildTree(items);
    },

    getFactionTree: async (worldViewId: number) => {
        const response = await fetch.get(
            '/api/aiNoval/faction/list', 
            {
                params: { worldview_id: worldViewId }
            }
        );

        const data = response.data as IFactionDefData[];
        response.data = buildTree(data);

        return response;
    },
    addFactionRelation: async (relation: IFactionRelation) => {
        const response = await fetch.post(
            '/api/aiNoval/faction/relation', 
            relation
        );
        return response;
    },
    updateFactionRelation: async (relation: IFactionRelation) => {
        const response = await fetch.post(
            '/api/aiNoval/faction/relation', 
            relation,
            {
                params: { id: relation.id }
            }
        );
        return response;
    },
    deleteFactionRelation: async (id: number) => {
        const response = await fetch.delete(
            '/api/aiNoval/faction/relation', 
            {
                params: { id }
            }
        );
        return response;
    },

    getFactionRelationList: async (worldViewId: number, factionId: number | null = null, limit: number = 2000) => {
        let params: { worldview_id: number; source_faction_id?: number; limit: number } = {
            worldview_id: worldViewId,
            limit: limit
        }

        if (typeof factionId === 'number') {
            params.source_faction_id = factionId;
        }

        const response = await fetch.get(
            '/api/aiNoval/faction/relation/list', 
            {
                params: params,
            }
        );
        return response;
    },

    findFaction: (worldviewId: number, keywords: string[], threshold?: number) => {
        return fetch.get('/api/web/aiNoval/llm/once/findFaction', { 
            params: { 
                worldviewId, 
                keywords: keywords.join(','),
                threshold: threshold || 0.5
            } 
        });
    },

    generateFactionGeoNamingRules: (params: {
        cultureTags: string;
        factionName?: string;
        factionCulture?: string;
        description?: string;
    }) => {
        return fetch.post<{ geo_naming_habit: string; geo_naming_suffix: string; geo_naming_prohibition: string }>(
            '/api/web/aiNoval/llm/once/generateFactionGeoNamingRules',
            params
        );
    },

    getUsableFactionRelationsById: async (factionId: number) => {
        const response = await fetch.get(
            '/api/web/aiNoval/faction/relation/usable', 
            {
                params: { faction_id: factionId }
            }
        );
        return response;
    }
}