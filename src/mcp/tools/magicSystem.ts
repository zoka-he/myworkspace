import { BaseMCPTool } from "../core/baseMcpTool";
import type { MCPToolDefinition } from "../core/mcpTypes";
import getMagicSystem from "@/src/domain/novel/getMagicSystem";
import _ from "lodash";

export class MagicSystemTool extends BaseMCPTool {
    readonly definition: MCPToolDefinition = {
        name: 'magic_system',
        description: '获取技能系统',
        inputSchema: {
            type: 'object',
            properties: {
                worldview_id: {
                    type: 'number',
                    description: '世界观 ID',
                },
            },
        }
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
        const magicSystemDefinitions = await getMagicSystem(worldviewId);
        return {
            content: [{ type: 'application/json' as const, data: magicSystemDefinitions }],
        };
    }
}