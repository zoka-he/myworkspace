import { IWorldState, IWorldStateHistory } from '@/src/types/IAiNoval';
import { mockWorldStates, mockWorldStateHistories } from './mockData';

// 模拟API延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default {
  // 获取世界态列表
  getWorldStateList: async (params: {
    worldview_id: number;
    state_type?: string;
    status?: string;
    impact_level?: string;
    page?: number;
    limit?: number;
  }) => {
    await delay(300);
    let data = [...mockWorldStates];
    
    // 筛选
    if (params.worldview_id) {
      data = data.filter(item => item.worldview_id === params.worldview_id);
    }
    if (params.state_type) {
      data = data.filter(item => item.state_type === params.state_type);
    }
    if (params.status) {
      data = data.filter(item => item.status === params.status);
    }
    if (params.impact_level) {
      data = data.filter(item => item.impact_level === params.impact_level);
    }
    
    // 分页
    const page = params.page || 1;
    const limit = params.limit || 20;
    const start = (page - 1) * limit;
    const end = start + limit;
    
    return {
      data: data.slice(start, end),
      count: data.length,
    };
  },

  // 获取单个世界态
  getWorldState: async (id: number) => {
    await delay(200);
    const item = mockWorldStates.find(w => w.id === id);
    if (!item) {
      throw new Error('世界态不存在');
    }
    return item;
  },

  // 创建世界态
  createWorldState: async (data: IWorldState) => {
    await delay(500);
    const newItem: IWorldState = {
      ...data,
      id: Math.max(...mockWorldStates.map(w => w.id || 0)) + 1,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockWorldStates.push(newItem);
    return newItem;
  },

  // 更新世界态
  updateWorldState: async (id: number, data: Partial<IWorldState>) => {
    await delay(500);
    const index = mockWorldStates.findIndex(w => w.id === id);
    if (index === -1) {
      throw new Error('世界态不存在');
    }
    mockWorldStates[index] = {
      ...mockWorldStates[index],
      ...data,
      updated_at: new Date(),
    };
    return mockWorldStates[index];
  },

  // 删除世界态
  deleteWorldState: async (id: number) => {
    await delay(300);
    const index = mockWorldStates.findIndex(w => w.id === id);
    if (index === -1) {
      throw new Error('世界态不存在');
    }
    mockWorldStates.splice(index, 1);
    return { success: true };
  },

  // 获取引用关系
  getWorldStateReferences: async (id: number) => {
    await delay(200);
    const item = mockWorldStates.find(w => w.id === id);
    if (!item) {
      throw new Error('世界态不存在');
    }
    
    const referenced = (item.related_world_state_ids || []).map(refId => 
      mockWorldStates.find(w => w.id === refId)
    ).filter(Boolean) as IWorldState[];
    
    const referencedBy = mockWorldStates.filter(w => 
      (w.related_world_state_ids || []).includes(id)
    );
    
    return {
      referenced, // 引用了哪些
      referencedBy, // 被哪些引用
    };
  },

  // 验证引用关系
  validateReferences: async (data: {
    world_state_id: number;
    referenced_ids: number[];
  }) => {
    await delay(300);
    const errors: string[] = [];
    
    // 检查循环引用
    const checkCircular = (id: number, visited: Set<number>): boolean => {
      if (visited.has(id)) return true;
      visited.add(id);
      const item = mockWorldStates.find(w => w.id === id);
      if (item?.related_world_state_ids) {
        return item.related_world_state_ids.some(refId => checkCircular(refId, visited));
      }
      return false;
    };
    
    for (const refId of data.referenced_ids) {
      if (checkCircular(refId, new Set([data.world_state_id]))) {
        errors.push(`引用 ${refId} 会导致循环引用`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  },

  // 从章节提取世界态
  extractFromChapters: async (params: {
    chapter_ids: number[];
    worldview_id: number;
  }) => {
    await delay(2000); // 模拟LLM分析时间
    
    // 模拟提取结果
    return {
      results: [
        {
          state_type: 'world_event',
          title: '战争爆发',
          description: '从章节内容中提取的世界大事件',
          confidence: 0.85,
          related_faction_ids: [1, 2],
        },
        {
          state_type: 'faction_agreement',
          title: '停战协议',
          description: '从章节内容中提取的阵营协约',
          confidence: 0.75,
          related_faction_ids: [1, 2],
        },
      ],
    };
  },
};
