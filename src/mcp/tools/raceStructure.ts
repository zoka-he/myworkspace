import _ from 'lodash';
import { BaseMCPTool } from '../core/baseMcpTool';
import type { MCPToolDefinition } from '../core/mcpTypes';
import getRaceStructure from '@/src/domain/novel/raceStructure';

export class RaceStructureTool extends BaseMCPTool {
  readonly definition: MCPToolDefinition = {
    name: 'race_structure',
    description: '获取指定世界观下族群树结构（主种族与亚种层级）',
    inputSchema: {
      type: 'object',
      properties: {
        worldview_id: {
          type: 'number',
          description: '世界观 ID',
        },
      },
      required: ['worldview_id'],
    },
  };

  validateArgs(args: Record<string, unknown>): string | null {
    const base = super.validateArgs(args);
    if (base) return base;
    const wid = args.worldview_id;
    if (wid === undefined || wid === null) return '缺少必填参数: worldview_id';
    const n = typeof wid === 'string' ? _.toNumber(wid) : Number(wid);
    if (!Number.isInteger(n) || n < 1) return 'worldview_id 必须为正整数';
    return null;
  }

  async execute(args: { worldview_id: number }): Promise<{ content: { type: 'text'; text: string }[]; isError: boolean }> {
    const worldviewId = typeof args.worldview_id === 'string' ? _.toNumber(args.worldview_id) : args.worldview_id;
    try {
      const tree = await getRaceStructure(worldviewId);
      const text = JSON.stringify(tree, null, 2);
      return {
        content: [{ type: 'text' as const, text }],
        isError: false,
      };
    } catch (e: unknown) {
      return {
        content: [{ type: 'text' as const, text: `race_structure 执行失败: ${e instanceof Error ? e.message : String(e)}` }],
        isError: true,
      };
    }
  }
}
