import { IBrainstorm } from '@/src/types/IAiNoval';
import { ApiResponse } from '@/src/types/ApiResponse';
import fetch from '@/src/fetch';
import {
  getBrainstormList,
  getBrainstormById,
  createBrainstorm,
  updateBrainstorm,
  deleteBrainstorm,
} from '@/src/api/aiNovel';

export interface ExpandAnalysisDirectionPayload {
  worldview_id: number;
  title: string;
  content: string;
  analysis_direction?: string;
}

export interface ExpandAnalysisDirectionResult {
  analysis_direction: string;
}

export default {
  // 获取脑洞列表
  getBrainstormList: async (params: {
    worldview_id: number;
    brainstorm_type?: string;
    status?: string | string[];
    priority?: string;
    category?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const result = await getBrainstormList(params, params.page || 1, params.limit || 20);
    return {
      data: result.data,
      count: result.count,
    };
  },

  // 获取单个脑洞
  getBrainstorm: async (id: number) => {
    return await getBrainstormById(id);
  },

  // 创建脑洞
  createBrainstorm: async (data: IBrainstorm) => {
    return await createBrainstorm(data);
  },

  // 更新脑洞
  updateBrainstorm: async (id: number, data: Partial<IBrainstorm>) => {
    return await updateBrainstorm(id, data);
  },

  // 删除脑洞
  deleteBrainstorm: async (id: number) => {
    await deleteBrainstorm(id);
    return { success: true };
  },

  /** 方案 A：先分析问题，生成扩展问题 + 限制性假设，回写到「分析方向」（ReAct + MCP，deepseek-chat） */
  expandAnalysisDirection: async (payload: ExpandAnalysisDirectionPayload): Promise<ExpandAnalysisDirectionResult> => {
    const res = await fetch.post<ApiResponse<ExpandAnalysisDirectionResult>>(
      '/api/web/aiNoval/llm/once/brainstormExpandQuestions',
      payload,
      {
        timeout: 1000 * 60 * 5,
      }
    );
    if (!res.success || res.error) throw new Error(res.error || '生成分析方向失败');
    if (!res.data) throw new Error('未返回分析方向内容');
    return res.data;
  },

  // LLM分析脑洞
  // TODO: 这个功能需要后续实现分析API
  analyzeBrainstorm: async (id: number) => {
    // 先更新状态为分析中
    await updateBrainstorm(id, { analysis_status: 'analyzing' });
    
    // TODO: 调用分析API
    // 这里暂时返回一个占位符，实际应该调用分析服务
    throw new Error('分析功能待实现');
  },
};
