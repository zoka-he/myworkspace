// lib/mcp/tools/findRoleGroup.ts
import _ from 'lodash';
import { BaseMCPTool } from '../core/baseMcpTool';
import type { MCPToolDefinition } from '../core/mcpTypes';
import findRoleGroupDomain from '@/src/domain/novel/findRoleGroup';

function parsePageOrLimit(v: unknown, defaultVal: number): number | null {
  if (v === undefined || v === null) return defaultVal;
  const n = typeof v === 'string' ? _.toNumber(v) : Number(v);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

function removeEmptyFields<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'string' && value.trim() === '') return;
    (result as any)[key] = value;
  });
  return result;
}

export class FindRoleGroupTool extends BaseMCPTool {
  readonly definition: MCPToolDefinition = {
    name: 'find_role_group',
    description: '在指定世界观下查询角色组列表，支持分页、按状态筛选，也可按角色名称反查其所在的角色组。',
    inputSchema: {
      type: 'object',
      properties: {
        worldview_id: {
          type: 'number',
          description: '世界观 ID',
        },
        page: {
          type: 'number',
          description: '页码，默认 1',
          default: 1,
        },
        limit: {
          type: 'number',
          description: '每页条数，默认 100',
          default: 100,
        },
        group_status: {
          type: 'string',
          description: '可选，按角色组状态筛选，如 active/dormant/dissolved 等',
        },
        role_name: {
          type: 'string',
          description: '可选，按角色名称（模糊匹配）筛选，只返回包含该角色的角色组',
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
    const page = parsePageOrLimit(args.page, 1);
    if (page === null) return 'page 必须为正整数';
    const limit = parsePageOrLimit(args.limit, 100);
    if (limit === null) return 'limit 必须为正整数';
    return null;
  }

  async execute(args: {
    worldview_id: number;
    page?: number;
    limit?: number;
    group_status?: string;
    role_name?: string;
  }): Promise<any> {
    const worldviewId =
      typeof args.worldview_id === 'string' ? _.toNumber(args.worldview_id) : args.worldview_id;
    const page = parsePageOrLimit(args.page, 1) ?? 1;
    const limit = parsePageOrLimit(args.limit, 100) ?? 100;

    try {
      const result = await findRoleGroupDomain(worldviewId, {
        page,
        limit,
        group_status: args.group_status,
        role_name: args.role_name,
      });

      // 对返回内容做精简：
      // 1) 去掉角色组上的 created_at / updated_at / sort_order
      // 2) 对角色组本体：移除值为空(null/undefined/空字符串)的字段
      // 3) 去掉成员上的 sort_order / created_at / updated_at / id / role_group_id / role_in_group / notes_with_others
      const cleanedData = result.data.map((group: any) => {
        const { created_at, updated_at, sort_order, members, ...restGroup } = group || {};
        const compactGroup = removeEmptyFields(restGroup);
        const cleanedMembers = Array.isArray(members)
          ? members.map((m: any) => {
              const {
                sort_order: memberSortOrder,
                created_at: mCreated,
                updated_at: mUpdated,
                id: memberId,
                role_group_id,
                role_in_group,
                notes_with_others,
                ...restMember
              } = m || {};
              return restMember;
            })
          : undefined;
        return {
          ...compactGroup,
          ...(cleanedMembers ? { members: cleanedMembers } : {}),
        };
      });

      const finalResult = { ...result, data: cleanedData };
      return {
        content: [{ type: 'json' as const, json: finalResult }],
        isError: false,
        rawData: finalResult,
      };
    } catch (e: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `find_role_group 执行失败: ${e?.message || String(e)}`,
          },
        ],
        isError: true,
      };
    }
  }
}
