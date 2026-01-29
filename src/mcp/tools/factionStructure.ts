// lib/mcp/tools/findGeo.ts
import _ from 'lodash';
import { BaseMCPTool } from '../core/baseMcpTool';
import type { MCPToolDefinition } from '../core/mcpTypes';
import FactionDefService from '@/src/services/aiNoval/factionDefService';
import { IFactionDefData } from '@/src/types/IAiNoval';

interface IFactionWithChildren extends IFactionDefData {
    children: IFactionWithChildren[]
}

const factionDefService = new FactionDefService();

export class FactionStructureTool extends BaseMCPTool {
  readonly definition: MCPToolDefinition = {
    name: 'faction_structure',
    description: '获取势力结构',
    inputSchema: {
      type: 'object',
      properties: {
        worldview_id: {
          type: 'number',
          description: '世界观 ID',
        },
      },
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
    if (!Number.isInteger(n) || n < 1) {
        return 'worldview_id 必须为正整数';
    }
    return null;
  }

  async execute(args: {
    worldview_id: number;
  }): Promise<any> {
    const worldviewId = typeof args.worldview_id === 'string'
      ? _.toNumber(args.worldview_id)
      : args.worldview_id;

    const data = await factionDefService.queryBySql(
      `SELECT * FROM Faction WHERE worldview_id = ?`,
      [worldviewId]
    );


    const map = new Map<number, IFactionWithChildren>();
    data.forEach(item => {
      map.set(item.id, {
        id: item.id,
        parent_id: item.parent_id,
        name: item.name,
        description: item.description,
        children: []
      });
    });

    const tree: IFactionWithChildren[] = [];

    map.forEach((item, key) => {
      if (item.parent_id) {
        const parent = map.get(item.parent_id);
        if (parent) {
          parent.children.push(item);
        }
      } else {
        tree.push(item);
      }
    });

    console.debug('factionStructure... tree --> ', tree);


    return {
      content: [{ type: 'application/json' as const, text: tree }],
    };
  }
}