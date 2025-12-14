// lib/mcp/tools/resolve-entity.tool.ts
import { BaseMCPTool } from '../core/baseMcpTool';
import type { MCPToolDefinition } from '../core/mcpTypes';

// 这是你之前实现的匹配逻辑（可独立模块）
async function normalizeAndMatchEntity(input: string, type: string = 'character') {
  // 这里是你之前实现的匹配逻辑
  const mockDB: Record<string, any[]> = {
    character: [
      { id: 'char_001', canonicalName: '杰克', aliases: ['Jack', 'Jake'], description: '主角' },
      { id: 'char_002', canonicalName: '埃里克', aliases: ['Eric'], description: '国王' },
    ],
    location: [
      { id: 'loc_001', canonicalName: '北方要塞', aliases: ['North Fortress'], description: '边境堡垒' },
    ]
  };
  
  const normalizedInput = input.toLowerCase().trim();
  const entities = mockDB[type] || [];
  
  // 精确匹配逻辑
  for (const entity of entities) {
    const allNames = [entity.canonicalName, ...entity.aliases].map(n => n.toLowerCase());
    if (allNames.includes(normalizedInput)) {
      return {
        found: true,
        canonicalName: entity.canonicalName,
        description: entity.description,
        confidence: 1.0
      };
    }
  }
  
  // 模糊匹配逻辑...
  return { found: false, suggestion: null };
}

export class ResolveEntityTool extends BaseMCPTool {
  readonly definition: MCPToolDefinition = {
    name: 'resolve_entity',
    description: '根据地名或人名解析出世界观中的唯一实体。自动处理口癖、翻译差异（如Jack->杰克）。',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '需要解析的名称，如"Jack"或"北方要塞"'
        },
        type: {
          type: 'string',
          enum: ['character', 'location', 'faction'],
          description: '实体类型',
          default: 'character'
        }
      },
      required: ['name']
    }
  };
  
  async execute(args: { name: string; type?: string }): Promise<any> {
    const result = await normalizeAndMatchEntity(args.name, args.type);
    
    if (result.found === true) {
      return {
        content: [{
          type: 'text',
          // 关键：明确告知AI映射关系
          text: `成功将输入「${args.name}」映射到实体：${result.canonicalName}。\n描述：${result.description}\n后续请使用官方名称「${result.canonicalName}」。`
        }],
        isError: false,
        rawData: {
          canonicalName: result.canonicalName,
          originalInput: args.name,
          confidence: result.confidence,
          timestamp: new Date().toISOString()
        }
      };
    } else {
      return {
        content: [{
          type: 'text',
          text: `未找到与「${args.name}」匹配的${args.type || '角色'}。${result.suggestion ? `建议：${result.suggestion}` : '请确认名称或创建新实体。'}`
        }],
        isError: true
      };
    }
  }
}