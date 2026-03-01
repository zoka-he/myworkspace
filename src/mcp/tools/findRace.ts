import _ from 'lodash';
import { BaseMCPTool } from '../core/baseMcpTool';
import type { MCPToolDefinition } from '../core/mcpTypes';
import findRaceDomain from '@/src/domain/novel/findRace';

function normalizeKeywords(v: unknown): string[] | null {
  if (_.isArray(v)) {
    const arr = v.filter((x) => _.isString(x) && (x as string).trim().length > 0);
    return arr.length ? arr : null;
  }
  if (_.isString(v) && (v as string).trim().length > 0) {
    return [(v as string).trim()];
  }
  return null;
}

function parseThreshold(v: unknown): number | null {
  if (v === undefined || v === null) return 0.5;
  const n = typeof v === 'string' ? _.toNumber(v) : Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1) return null;
  return n;
}

export class FindRaceTool extends BaseMCPTool {
  readonly definition: MCPToolDefinition = {
    name: 'find_race',
    description: '在指定世界观下按关键词（向量召回）检索族群/种族，返回相似度≥threshold的结果。',
    inputSchema: {
      type: 'object',
      properties: {
        worldview_id: {
          type: 'number',
          description: '世界观 ID',
        },
        keywords: {
          type: 'string',
          description: '检索关键词，可传字符串或字符串数组',
        },
        threshold: {
          type: 'number',
          description: '相似度阈值 [0,1]，默认 0.5',
          default: 0.5,
        },
      },
      required: ['worldview_id', 'keywords'],
    },
  };

  validateArgs(args: Record<string, unknown>): string | null {
    const base = super.validateArgs(args);
    if (base) return base;
    const wid = args.worldview_id;
    if (wid === undefined || wid === null) return '缺少必填参数: worldview_id';
    const n = typeof wid === 'string' ? _.toNumber(wid) : Number(wid);
    if (!Number.isInteger(n) || n < 1) return 'worldview_id 必须为正整数';
    const kw = normalizeKeywords(args.keywords);
    if (!kw) return 'keywords 不能为空（字符串或非空字符串数组）';
    const th = parseThreshold(args.threshold);
    if (th === null) return 'threshold 必须为 [0,1] 之间的数字';
    return null;
  }

  async execute(args: {
    worldview_id: number;
    keywords: string | string[];
    threshold?: number;
  }): Promise<{ content: { type: 'text'; text: string }[]; isError: boolean; rawData?: unknown }> {
    const keywords = normalizeKeywords(args.keywords)!;
    const worldviewId = typeof args.worldview_id === 'string' ? _.toNumber(args.worldview_id) : args.worldview_id;
    const threshold = parseThreshold(args.threshold) ?? 0.5;

    try {
      const data = await findRaceDomain(worldviewId, keywords, threshold);
      const text = `找到 ${data.length} 条族群（相似度 ≥ ${threshold}）：\n${JSON.stringify(data, null, 2)}`;
      return {
        content: [{ type: 'text' as const, text }],
        isError: false,
        rawData: data,
      };
    } catch (e: unknown) {
      return {
        content: [{ type: 'text' as const, text: `find_race 执行失败: ${e instanceof Error ? e.message : String(e)}` }],
        isError: true,
      };
    }
  }
}
