// lib/mcp/core/tool.abstract.ts
import type { MCPToolDefinition, MCPToolResult } from './mcpTypes';

export abstract class BaseMCPTool {
  // 抽象属性：每个工具必须定义
  abstract readonly definition: MCPToolDefinition;
  
  // 抽象方法：每个工具必须实现执行逻辑
  abstract execute(args: Record<string, any>): Promise<MCPToolResult>;
  
  // 工具名称（便捷访问）
  get name(): string {
    return this.definition.name;
  }
  
  // 验证输入参数（可被子类覆盖）
  validateArgs(args: Record<string, any>): string | null {
    const { properties, required = [] } = this.definition.inputSchema;
    
    // 检查必填字段
    for (const field of required) {
      if (args[field] === undefined || args[field] === null) {
        return `缺少必填参数: ${field}`;
      }
    }
    
    // 检查字段类型（简化版，实际可更严格）
    for (const [field, value] of Object.entries(args)) {
      const schema = properties[field];
      if (schema && schema.enum && !schema.enum.includes(value)) {
        return `参数 ${field} 的值 "${value}" 不在允许范围内: [${schema.enum.join(', ')}]`;
      }
    }
    
    return null;
  }
}