import fetch from '@/src/fetch';
import { IRoleGroup, IRoleGroupMember } from '@/src/types/IAiNoval';

const apiCalls = {
    getRoleGroupList: (worldViewId: number | null, params?: { page?: number; limit?: number; group_status?: string }) => {
        if (!worldViewId) return Promise.resolve({ data: [], count: 0 });
        return fetch.get<{ data: IRoleGroup[]; count: number }>('/api/aiNoval/roleGroup/list', {
            params: { worldview_id: worldViewId, page: params?.page ?? 1, limit: params?.limit ?? 100, group_status: params?.group_status },
        });
    },
    getRoleGroup: (id: number) => {
        return fetch.get<IRoleGroup & { members?: IRoleGroupMember[] }>('/api/aiNoval/roleGroup', { params: { id } });
    },
    createRoleGroup: (data: Partial<IRoleGroup> & { members?: Array<{ role_info_id: number; sort_order?: number; role_in_group?: string; notes_with_others?: string }> }) => {
        return fetch.post('/api/aiNoval/roleGroup', data);
    },
    updateRoleGroup: (data: Partial<IRoleGroup> & { id: number; members?: Array<{ role_info_id: number; sort_order?: number; role_in_group?: string; notes_with_others?: string }> }) => {
        return fetch.post('/api/aiNoval/roleGroup', data, { params: { id: data.id } });
    },
    deleteRoleGroup: (id: number) => {
        return fetch.delete('/api/aiNoval/roleGroup', { params: { id } });
    },
    getRoleGroupMembers: (roleGroupId: number) => {
        return fetch.get<Array<IRoleGroupMember & { name_in_worldview?: string }>>('/api/aiNoval/roleGroup/members/list', {
            params: { role_group_id: roleGroupId },
        });
    },
};

export default apiCalls;
