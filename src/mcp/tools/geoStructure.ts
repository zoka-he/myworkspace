// lib/mcp/tools/findGeo.ts
import _ from 'lodash';
import { BaseMCPTool } from '../core/baseMcpTool';
import type { MCPToolDefinition } from '../core/mcpTypes';
import getGeoStructure from '@/src/domain/novel/geoStructure';

export class GeoStructureTool extends BaseMCPTool {
  readonly definition: MCPToolDefinition = {
    name: 'geo_structure',
    description: '获取地理结构',
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

    const tree = await getGeoStructure(worldviewId);

    return {
      content: [{ type: 'application/json' as const, data: tree }],
    };
  }
}