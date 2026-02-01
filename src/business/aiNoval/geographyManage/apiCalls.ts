import fetch from "@/src/fetch";
import { IGeoUnionData } from "@/src/types/IAiNoval";

export interface GenerateGeoContextParams {
    locationType: string;
    parentGeo?: { name: string; description?: string } | null;
    adjacentGeos?: Array<{ name: string; description?: string }> | null;
    relatedFactions?: Array<{ name: string; description?: string }> | null;
}

export interface GenerateGeoContextResult {
    regionFeature: string;
    namingBackground: string;
}

export interface GenerateNamingConstraintParams {
    locationType: string;
    regionFeature: string;
    namingBackground: string;
    namingSource: string;
    relatedFactions?: Array<{
        name: string;
        geo_naming_habit?: string;
        geo_naming_suffix?: string;
        geo_naming_prohibition?: string;
    }> | null;
    adjacentGeos?: Array<{ name: string }> | null;
}

export interface GenerateNamingConstraintResult {
    namingHabit: string;
    specialRequirement: string;
    specialSuffix: string;
    prohibition: string;
}

export interface GenerateGeoNamesParams {
    worldview_id: number;
    locationType: string;
    regionFeature: string;
    namingBackground?: string;
    namingSource: string;
    namingHabit?: string;
    specialRequirement?: string;
    specialSuffix?: string;
    prohibition?: string;
    /** 相邻地点名称，用于参考地点的性质 */
    adjacentGeoNames?: string;
    /** 已有地名、势力名（由 FindGeo/FindFaction 等获取），生成时需避免重名/谐音 */
    excludeNames?: string;
}

export interface GeoAdviceItem {
    id: string;
    name: string;
    description?: string;
}

const apiCalls = {
    findGeo: (worldviewId: number, keywords: string[], threshold?: number) => {
        return fetch.get('/api/web/aiNoval/llm/once/findGeo', { 
            params: { 
                worldviewId, 
                keywords: keywords.join(','),
                threshold: threshold || 0.5
            } 
        });
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
    generateGeoContext: (params: GenerateGeoContextParams) => {
        return fetch.post<GenerateGeoContextResult>('/api/web/aiNoval/llm/once/generateGeoAdviceBaseContext', params);
    },
    generateNamingConstraint: (params: GenerateNamingConstraintParams) => {
        return fetch.post<GenerateNamingConstraintResult>('/api/web/aiNoval/llm/once/generateGeoAdviceNamingConstraint', params);
    },
    generateGeoNames: (params: GenerateGeoNamesParams) => {
        return fetch.post<{ items: GeoAdviceItem[] }>(
            '/api/web/aiNoval/llm/once/difyGenGeoNames', 
            params,
            {
                timeout: 1000 * 60 * 5, // 5 minutes
            }
        );
    },
}

export default apiCalls;
