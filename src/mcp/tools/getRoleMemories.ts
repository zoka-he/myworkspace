import _ from 'lodash';
import { BaseMCPTool } from '../core/baseMcpTool';
import type { MCPToolDefinition } from '../core/mcpTypes';
import RoleMemoryService from '@/src/services/aiNoval/roleMemoryService';
import findRole from '@/src/domain/novel/findRole';

const roleMemoryService = new RoleMemoryService();

function parseMemoriesRows(rows: any[]): any[] {
  return (rows || []).map((row) => {
    const item = { ...row };
    if (item.affects_slots != null && typeof item.affects_slots === 'string') {
      try {
        item.affects_slots = JSON.parse(item.affects_slots);
      } catch {
        item.affects_slots = null;
      }
    }
    return item;
  });
}

export class GetRoleMemoriesTool extends BaseMCPTool {
  readonly definition: MCPToolDefinition = {
    name: 'get_role_memories',
    description:
      '按角色查询角色记忆（与章节发展关联、带优先级与影响维度）。可指定章节号、优先级、影响维度(affects_slot)、叙事类型(memory_type)过滤，用于脑洞分析或剧情生成时按需引用。',
    inputSchema: {
      type: 'object',
      properties: {
        worldview_id: {
          type: 'number',
          description: '世界观 ID',
        },
        role_name: {
          type: 'string',
          description: '角色名称（与 find_role 一致）；与 role_info_id 二选一',
        },
        role_info_id: {
          type: 'number',
          description: '角色信息 ID；与 role_name 二选一',
        },
        chapter_number: {
          type: 'number',
          description: '当前章节号；不传则返回全局记忆等；传入则仅返回包含该章节的记忆',
        },
        importance_min: {
          type: 'string',
          description: '最低重要性（词汇）：critical/key关键、high重要、medium一般、low参考、marginal备选；默认 high',
          default: 'high',
        },
        memory_type: {
          type: 'string',
          description: '叙事类型过滤：fact / relationship_change / goal / secret / trauma / rule',
        },
        affects_slot: {
          type: 'string',
          description: '只返回影响该维度的记忆：belief/desire/intention/personality/relationship/knowledge/principle/trauma',
        },
        related_role_info_id: {
          type: 'number',
          description: '只返回对某角色的关系类记忆',
        },
        limit: {
          type: 'number',
          description: '最多返回条数，默认 20',
          default: 20,
        },
      },
      required: ['worldview_id'],
    },
  };

  validateArgs(args: Record<string, any>): string | null {
    const base = super.validateArgs(args);
    if (base) return base;
    const wid = args.worldview_id;
    if (wid === undefined || wid === null) return '缺少必填参数: worldview_id';
    const n = typeof wid === 'string' ? _.toNumber(wid) : Number(wid);
    if (!Number.isInteger(n) || n < 1) return 'worldview_id 必须为正整数';
    const hasName = args.role_name != null && String(args.role_name).trim().length > 0;
    const hasId = args.role_info_id != null && Number(args.role_info_id) > 0;
    if (!hasName && !hasId) return '必须提供 role_name 或 role_info_id 之一';
    return null;
  }

  async execute(args: {
    worldview_id: number;
    role_name?: string;
    role_info_id?: number;
    chapter_number?: number;
    importance_min?: string;
    memory_type?: string;
    affects_slot?: string;
    related_role_info_id?: number;
    limit?: number;
  }): Promise<any> {
    const worldviewId = typeof args.worldview_id === 'string' ? _.toNumber(args.worldview_id) : args.worldview_id;
    let roleInfoId: number | null = null;
    if (args.role_info_id != null && Number(args.role_info_id) > 0) {
      roleInfoId = Number(args.role_info_id);
    } else if (args.role_name != null && String(args.role_name).trim().length > 0) {
      try {
        const roles = await findRole(worldviewId, [String(args.role_name).trim()], 0.5);
        if (roles.length > 0 && roles[0].id != null) {
          roleInfoId = roles[0].id;
        }
      } catch (e) {
        return {
          content: [{ type: 'text' as const, text: `解析角色名称失败: ${(e as Error)?.message || String(e)}` }],
          isError: true,
        };
      }
    }
    if (roleInfoId == null) {
      return {
        content: [{ type: 'text' as const, text: '未找到对应角色，请检查 role_name 或 role_info_id' }],
        isError: false,
        rawData: [],
      };
    }

    try {
      const result = await roleMemoryService.getListForMcp({
        worldview_id: worldviewId,
        role_info_id: roleInfoId,
        chapter_number: args.chapter_number,
        importance_min: args.importance_min ?? 'high',
        memory_type: args.memory_type,
        affects_slot: args.affects_slot,
        related_role_info_id: args.related_role_info_id,
        limit: args.limit ?? 20,
      });
      const list = parseMemoriesRows(result.data || []);
      const roleName = args.role_name || `role_info_id=${roleInfoId}`;
      const importanceLabels: Record<string, string> = {
        critical: '关键',
        high: '重要',
        medium: '一般',
        low: '参考',
        marginal: '备选',
      };
      const lines = list.map((m: any, i: number) => {
        const anxianTag = m.narrative_usage === 'anxian' ? '【暗线】' : '';
        const impLabel = importanceLabels[m.importance] || m.importance || '-';
        const contentSnippet = (m.content || '').slice(0, 100) + ((m.content || '').length > 100 ? '...' : '');
        const impactPart = m.impact_summary ? ` | 影响: ${(m.impact_summary || '').slice(0, 80)}${(m.impact_summary || '').length > 80 ? '...' : ''}` : '';
        return `${i + 1}. ${anxianTag}[${impLabel}] [${m.affects_slot || '-'}] [${m.memory_type || '-'}] ${contentSnippet}${impactPart}`;
      });
      const text = `角色「${roleName}」记忆共 ${list.length} 条：\n${lines.join('\n')}`;
      return {
        content: [{ type: 'text' as const, text }],
        isError: false,
        rawData: list,
      };
    } catch (e: any) {
      return {
        content: [{ type: 'text' as const, text: `get_role_memories 执行失败: ${e?.message || String(e)}` }],
        isError: true,
      };
    }
  }
}
