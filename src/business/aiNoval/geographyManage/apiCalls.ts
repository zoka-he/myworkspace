import fetch from "@/src/fetch";
import { IGeoUnionData } from "@/src/types/IAiNoval";

const apiCalls = {
    findGeo: (worldviewId: number, keywords: string[], threshold?: number) => {
        return fetch.get('/api/web/aiNoval/llm/once/findGeo', { 
            params: { 
                worldviewId, 
                keywords: keywords.length === 1 ? keywords[0] : keywords,
                threshold: threshold || 0.5
            } 
        });
    }
}

export default apiCalls;
