import { IBrainstorm, IBrainstormAnalysisResult } from '@/src/types/IAiNoval';
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
  user_question?: string;
  expanded_questions?: string;
}

export interface ExpandAnalysisDirectionResult {
  expanded_questions?: string;
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

  // LLM分析脑洞（后端会先保存表单数据再分析）
  analyzeBrainstorm: async (id: number, formData?: Partial<IBrainstorm>): Promise<IBrainstormAnalysisResult> => {
    // 调用分析API，传递表单数据（后端会先保存再分析）
    const res = await fetch.post<ApiResponse<IBrainstormAnalysisResult>>(
      `/api/web/aiNoval/brainstorm/analyze?id=${id}`,
      { formData }, // 传递表单数据，后端先保存再分析
      {
        timeout: 1000 * 60 * 10, // 10分钟超时
      }
    );
    
    if (!res.success || res.error) {
      throw new Error(res.error || '分析失败');
    }
    
    if (!res.data) {
      throw new Error('未返回分析结果');
    }
    
    return res.data;
  },

  // 生成章节纲要
  generateChapterOutline: async (id: number): Promise<string> => {
    const res = await fetch.post<ApiResponse<{ chapter_outline: string }>>(
      `/api/web/aiNoval/brainstorm/generateChapterOutline?id=${id}`,
      {},
      {
        timeout: 1000 * 60 * 5, // 5分钟超时
      }
    );
    
    if (!res.success || res.error) {
      throw new Error(res.error || '生成章节纲要失败');
    }
    
    if (!res.data?.chapter_outline) {
      throw new Error('未返回章节纲要内容');
    }
    
    return res.data.chapter_outline;
  },
};
