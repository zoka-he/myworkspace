import fetch from "@/src/fetch";
import { IRoleData, IRoleInfo, IRoleRelation, IRoleMemory, IRoleRelationType, IRolePositionRecord, IWorldviewPositionRule } from "@/src/types/IAiNoval";

const apiCalls = {
    getRoleList: (worldViewId?: number | null, page: number = 1, limit: number = 100) => {
        return fetch.get('/api/aiNoval/role/list', { params: { worldview_id: worldViewId, page, limit } });
    },
    createRole: (data: { name?: string; is_enabled?: 'Y' | 'N' }) => {
        return fetch.post('/api/aiNoval/role', data);
    },
    updateRole: (data: IRoleData) => {
        return fetch.post('/api/aiNoval/role', data, { params: { id: data.id } });
    },
    deleteRole: (roleId: number) => {
        return fetch.delete(`/api/aiNoval/role`, { params: { id: roleId } });
    },
    getRoleInfoList: (roleId: number, limit: number = 20) => {
        return fetch.get(`/api/aiNoval/role/info/list`, { params: { role_id: roleId, page: 1, limit } });
    },
    getWorldViewRoleInfoList: (worldViewId: number, limit: number = 20) => {
        return fetch.get(`/api/aiNoval/role/info/list`, { params: { worldview_id: worldViewId, page: 1, limit } });
    },
    createRoleInfo: (data: IRoleInfo) => {
        return fetch.post(`/api/aiNoval/role/info`, data );
    },
    updateRoleInfo: (data: IRoleInfo) => {
        return fetch.post(`/api/aiNoval/role/info`, data, { params: { id: data.id } });
    },
    deleteRoleInfo: (data: IRoleData) => {
        return fetch.delete(`/api/aiNoval/role/info`, { params: { id: data.id } });
    },
    getRoleRelationList: (worldViewId: number, roleId: number, page: number = 1, limit: number = 100) => {
        return fetch.get(`/api/aiNoval/role/relation/list`, { params: { worldview_id: worldViewId, role_id: roleId, page, limit } });
    },
    getWorldViewRoleRelationList: (worldViewId: number, page: number = 1, limit: number = 100) => {
        return fetch.get(`/api/aiNoval/role/relation/list`, { params: { worldview_id: worldViewId, page, limit } });
    },
    createRoleRelation: (data: IRoleRelation) => {
        return fetch.post(`/api/aiNoval/role/relation`, data);
    },
    updateRoleRelation: (data: IRoleRelation) => {
        return fetch.post(`/api/aiNoval/role/relation`, data, { params: { id: data.id } });
    },
    deleteRoleRelation: (data: IRoleRelation) => {
        return fetch.delete(`/api/aiNoval/role/relation`, { params: { id: data.id } });
    },
    getRoleRelationTypeList: (page: number = 1, limit: number = 500) => {
        return fetch.get(`/api/aiNoval/role/relationType/list`, { params: { page, limit } });
    },
    createRoleRelationType: (data: Pick<IRoleRelationType, "id" | "label" | "default_strength">) => {
        return fetch.post(`/api/aiNoval/role/relationType`, data);
    },
    updateRoleRelationType: (data: Pick<IRoleRelationType, "id" | "label" | "default_strength">) => {
        return fetch.post(`/api/aiNoval/role/relationType`, data, { params: { id: data.id } });
    },
    deleteRoleRelationType: (id: string) => {
        return fetch.delete(`/api/aiNoval/role/relationType`, { params: { id } });
    },
    findRole: (worldviewId: number, keywords: string[], threshold?: number) => {
        return fetch.get('/api/web/aiNoval/llm/once/findRole', { 
            params: { 
                worldviewId, 
                keywords: keywords.length === 1 ? keywords[0] : keywords,
                threshold: threshold || 0.5
            } 
        });
    },
    getRoleMemoryList: (params: { worldview_id: number; role_info_id?: number; affects_slot?: string; memory_type?: string; importance_min?: string; page?: number; limit?: number }) => {
        return fetch.get('/api/web/aiNoval/roleMemory/list', { params });
    },
    getRoleMemory: (id: number) => {
        return fetch.get('/api/web/aiNoval/roleMemory', { params: { id } });
    },
    createRoleMemory: (data: Partial<IRoleMemory>) => {
        return fetch.post('/api/web/aiNoval/roleMemory', data);
    },
    updateRoleMemory: (id: number, data: Partial<IRoleMemory>) => {
        return fetch.post('/api/web/aiNoval/roleMemory', data, { params: { id } });
    },
    deleteRoleMemory: (id: number) => {
        return fetch.delete('/api/web/aiNoval/roleMemory', { params: { id } });
    },
    /** 将源角色信息版本的记忆复制到目标版本（同一 role_id） */
    copyRoleMemoriesFromVersion: (body: {
        worldview_id: number;
        from_role_info_id: number;
        to_role_info_id: number;
    }) => {
        return fetch.post('/api/web/aiNoval/roleMemory/copy', body);
    },
    getRolePositionList: (params: { worldview_id: number; role_id?: number; role_info_id?: number; page?: number; limit?: number }) => {
        return fetch.get('/api/aiNoval/role/position/list', { params });
    },
    getRolePosition: (id: number) => {
        return fetch.get('/api/aiNoval/role/position', { params: { id } });
    },
    createRolePosition: (data: Partial<IRolePositionRecord>) => {
        return fetch.post('/api/aiNoval/role/position', data);
    },
    updateRolePosition: (id: number, data: Partial<IRolePositionRecord>) => {
        return fetch.post('/api/aiNoval/role/position', data, { params: { id } });
    },
    deleteRolePosition: (id: number) => {
        return fetch.delete('/api/aiNoval/role/position', { params: { id } });
    },
    validateRolePosition: (data: Partial<IRolePositionRecord>) => {
        return fetch.post('/api/aiNoval/role/position/validate', data);
    },
    getWorldviewPositionRule: (worldview_id: number) => {
        return fetch.get('/api/aiNoval/worldview/position-rule', { params: { worldview_id } });
    },
    updateWorldviewPositionRule: (worldview_id: number, data: Partial<IWorldviewPositionRule>) => {
        return fetch.post('/api/aiNoval/worldview/position-rule', data, { params: { worldview_id } });
    },
}

export default apiCalls;