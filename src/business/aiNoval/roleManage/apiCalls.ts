import fetch from "@/src/fetch";
import { IRoleData, IRoleInfo, IRoleRelation } from "@/src/types/IAiNoval";

const apiCalls = {
    getRoleList: (worldViewId?: number | null, page: number = 1, limit: number = 100) => {
        return fetch.get('/api/aiNoval/role/list', { params: { worldview_id: worldViewId, page, limit } });
    },
    createRole: (data: { name?: string; }) => {
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
    createRoleInfo: (data: IRoleInfo) => {
        return fetch.post(`/api/aiNoval/role/info`, data );
    },
    updateRoleInfo: (data: IRoleInfo) => {
        return fetch.post(`/api/aiNoval/role/info`, data, { params: { id: data.id } });
    },
    deleteRoleInfo: (data: IRoleData) => {
        return fetch.delete(`/api/aiNoval/role/info`, { params: { id: data.id } });
    },
    getRoleRelationList: (roleId: number, page: number = 1, limit: number = 100) => {
        return fetch.get(`/api/aiNoval/role/relation/list`, { params: { role_id: roleId, page, limit } });
    },
    createRoleRelation: (data: IRoleRelation) => {
        return fetch.post(`/api/aiNoval/role/relation`, data);
    },
    updateRoleRelation: (data: IRoleRelation) => {
        return fetch.post(`/api/aiNoval/role/relation`, data, { params: { id: data.id } });
    },
    deleteRoleRelation: (data: IRoleRelation) => {
        return fetch.delete(`/api/aiNoval/role/relation`, { params: { id: data.id } });
    }
}

export default apiCalls;