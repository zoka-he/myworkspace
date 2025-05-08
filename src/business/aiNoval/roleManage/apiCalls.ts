import fetch from "@/src/fetch";

const apiCalls = {
    getRoleList: (worldViewId?: number | null, page: number = 1, limit: number = 100) => {
        return fetch.get('/api/aiNoval/role/list', { params: { worldview_id: worldViewId, page, limit } });
    },
    createRole: (data: { name?: string; }) => {
        return fetch.post('/api/aiNoval/role', data);
    },
    deleteRole: (roleId: number) => {
        return fetch.delete(`/api/aiNoval/role`, { params: { id: roleId } });
    }
}

export default apiCalls;