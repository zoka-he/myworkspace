import { BaseMCPTool } from '../core/baseMcpTool';
import type { MCPToolDefinition } from '../core/mcpTypes';
import WorldStateService from '@/src/services/aiNoval/worldStateService';
import type { IWorldState } from '@/src/types/IAiNoval';
import _ from 'lodash';

const JSON_FIELDS = [
  'related_faction_ids',
  'related_role_ids',
  'related_geo_codes',
  'related_event_ids',
  'related_chapter_ids',
  'related_world_state_ids',
  'affected_areas',
  'tags',
];

function parseJsonFields(row: Record<string, any>): IWorldState {
  const item = { ...row };
  JSON_FIELDS.forEach((key) => {
    if (item[key] != null && typeof item[key] === 'string') {
      try {
        item[key] = JSON.parse(item[key]);
      } catch {
        item[key] = null;
      }
    }
  });
  return item as IWorldState;
}

export class WorldStateTool extends BaseMCPTool {
  readonly definition: MCPToolDefinition = {
    name: 'world_state',
    description: '获取世界宏观设定列表。根据世界观 ID 查询该世界观下的世界宏观状态，支持按状态类型、状态、影响等级筛选和分页。返回中 faction_id、role_id、geo_code 已转换为名称字段：related_faction_names、related_role_names、related_geo_names。',
    inputSchema: {
      type: 'object',
      properties: {
        worldview_id: {
          type: 'number',
          description: '世界观 ID，必填',
        },
        state_type: {
          type: 'string',
          description: '世界态类型筛选，可选',
        },
        status: {
          type: 'string',
          description: '状态筛选，可选',
        },
        impact_level: {
          type: 'string',
          description: '影响等级筛选，可选',
        },
        page: {
          type: 'number',
          description: '页码，默认 1',
        },
        limit: {
          type: 'number',
          description: '每页条数，默认 20，最大建议 200',
        },
      },
      required: ['worldview_id'],
    },
  };

  validateArgs(args: Record<string, any>): string | null {
    const base = super.validateArgs(args);
    if (base) return base;
    const wid = args.worldview_id;
    if (wid === undefined || wid === null) {
      return '缺少必填参数: worldview_id';
    }
    const n = typeof wid === 'string' ? _.toNumber(wid) : Number(wid);
    if (!Number.isInteger(n) || n < 1) return 'worldview_id 必须为正整数';
    if (args.page != null) {
      const p = typeof args.page === 'string' ? _.toNumber(args.page) : Number(args.page);
      if (!Number.isInteger(p) || p < 1) return 'page 必须为正整数';
    }
    if (args.limit != null) {
      const l = typeof args.limit === 'string' ? _.toNumber(args.limit) : Number(args.limit);
      if (!Number.isInteger(l) || l < 1 || l > 500) return 'limit 必须为 1~500 的正整数';
    }
    return null;
  }

  async execute(args: {
    worldview_id: number;
    state_type?: string;
    status?: string;
    impact_level?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const worldviewId =
      typeof args.worldview_id === 'string' ? _.toNumber(args.worldview_id) : args.worldview_id;
    const page = args.page != null ? (typeof args.page === 'string' ? _.toNumber(args.page) : args.page) : 1;
    const limit = args.limit != null ? (typeof args.limit === 'string' ? _.toNumber(args.limit) : args.limit) : 20;

    const service = new WorldStateService();
    const result = await service.getListForMcp({
      worldview_id: worldviewId,
      state_type: args.state_type,
      status: args.status,
      impact_level: args.impact_level,
      page,
      limit,
    });

    const data = (result.data || []).map((row: Record<string, any>) => parseJsonFields(row));
    const count = result.count ?? 0;

    const jsonText = JSON.stringify({ data, count }, null, 2);
    const text = `成功获取世界态列表，共 ${count} 条。\n\n${jsonText}`;

    return {
      content: [{ type: 'text' as const, text }],
    };
  }
}
