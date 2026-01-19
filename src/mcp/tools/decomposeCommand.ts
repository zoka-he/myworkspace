// lib/mcp/tools/decompose-command.tool.ts
import { BaseMCPTool } from '../core/baseMcpTool';
import type { MCPToolDefinition } from '../core/mcpTypes';

export class DecomposeCommandTool extends BaseMCPTool {
  readonly definition: MCPToolDefinition = {
    name: 'decompose_story_command',
    description: '将模糊的创作指令分解为结构化要素（场景、角色、冲突、基调等）。',
    inputSchema: {
      type: 'object',
      properties: {
        user_command: {
          type: 'string',
          description: '用户的原始创作指令'
        },
        detail_level: {
          type: 'string',
          enum: ['brief', 'normal', 'detailed'],
          description: '分解详细程度',
          default: 'normal'
        }
      },
      required: ['user_command']
    }
  };
  
  async execute(args: { user_command: string; detail_level?: string }): Promise<any> {
    // 这里可以集成你的指令解析逻辑
    const elements = {
      场景: '北方要塞王座厅',
      核心角色: ['杰克', '埃里克国王'],
      核心冲突: '权力谈判',
      情感基调: '紧张、庄严',
      建议情节转折: '杰克展示神秘信物'
    };
    
    return {
      content: [{
        type: 'text',
        text: `已分解指令：「${args.user_command}」\n${Object.entries(elements).map(([k, v]) => `• ${k}: ${Array.isArray(v) ? v.join('、') : v}`).join('\n')}`
      }],
      isError: false,
      rawData: elements
    };
  }
}