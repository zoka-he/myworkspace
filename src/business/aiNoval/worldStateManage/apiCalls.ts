import { IWorldState } from '@/src/types/IAiNoval';
import {
  getWorldStateList as apiGetWorldStateList,
  createWorldState as apiCreateWorldState,
  updateWorldState as apiUpdateWorldState,
  deleteWorldState as apiDeleteWorldState,
} from '@/src/api/aiNovel';

/** 列表默认每页条数，前端表格分页基于当前页数据 */
const DEFAULT_LIST_LIMIT = 200;

export default {
  /** 获取世界态列表（对接 /api/web/aiNoval/worldState/list） */
  getWorldStateList: async (params: {
    worldview_id: number;
    state_type?: string;
    status?: string;
    impact_level?: string;
    sort_by?: 'impact_level' | 'status' | 'id';
    sort_order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) => {
    const page = params.page ?? 1;
    const limit = params.limit ?? DEFAULT_LIST_LIMIT;
    return apiGetWorldStateList(
      {
        worldview_id: params.worldview_id,
        state_type: params.state_type,
        status: params.status,
        impact_level: params.impact_level,
        sort_by: params.sort_by,
        sort_order: params.sort_order,
      },
      page,
      limit
    );
  },

  /** 创建世界态（对接 POST /api/web/aiNoval/worldState） */
  createWorldState: async (data: IWorldState) => {
    return apiCreateWorldState(data);
  },

  /** 更新世界态（对接 POST /api/web/aiNoval/worldState?id=xxx） */
  updateWorldState: async (id: number, data: Partial<IWorldState>) => {
    return apiUpdateWorldState(id, data);
  },

  /** 删除世界态（对接 DELETE /api/web/aiNoval/worldState?id=xxx） */
  deleteWorldState: async (id: number) => {
    return apiDeleteWorldState(id);
  },
};
