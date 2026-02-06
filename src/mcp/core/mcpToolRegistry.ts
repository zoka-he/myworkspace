// lib/mcp/core/registry.ts
import type { BaseMCPTool } from './baseMcpTool';
import type { MCPToolDefinition } from './mcpTypes';
import { allTools } from '../index';

export class MCPToolRegistry {
  private tools: Map<string, BaseMCPTool> = new Map();
  private _initialized: boolean = false;
  
  // 单例模式
  private static instance: MCPToolRegistry;
  static getInstance(): MCPToolRegistry {
    if (!MCPToolRegistry.instance) {
      MCPToolRegistry.instance = new MCPToolRegistry();
    }
    return MCPToolRegistry.instance;
  }

  /**
   * 确保工具已初始化（懒加载）
   */
  private ensureInitialized(): void {
    if (!this._initialized) {
      console.log('[MCPToolRegistry] 自动初始化工具注册...');
      this.registerAll(allTools);
      this._initialized = true;
    }
  }
  
  // 注册工具
  register(tool: BaseMCPTool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`工具 "${tool.name}" 已存在，将被覆盖`);
    }
    this.tools.set(tool.name, tool);
    console.log(`✓ 注册工具: ${tool.name}`);
  }
  
  // 批量注册
  registerAll(tools: BaseMCPTool[]): void {
    tools.forEach(tool => this.register(tool));
  }
  
  // 获取工具
  getTool(name: string): BaseMCPTool | undefined {
    return this.tools.get(name);
  }
  
  // 获取所有工具定义（用于tools/list响应）
  getAllToolDefinitions(): MCPToolDefinition[] {
    this.ensureInitialized();
    return Array.from(this.tools.values()).map(tool => tool.definition);
  }
  
  // 执行工具
  async executeTool(
    name: string, 
    args: Record<string, any>
  ): Promise<any> {
    this.ensureInitialized();
    const tool = this.getTool(name);
    if (!tool) {
      return {
        content: [{
          type: 'text',
          text: `错误：找不到工具 "${name}"`
        }],
        isError: true
      };
    }
    
    // 验证参数
    const validationError = tool.validateArgs(args);
    if (validationError) {
      return {
        content: [{
          type: 'text',
          text: `参数验证失败: ${validationError}`
        }],
        isError: true
      };
    }
    
    try {
      return await tool.execute(args);
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `工具执行错误: ${error.message}`
        }],
        isError: true
      };
    }
  }
  
  // 获取工具数量
  getToolCount(): number {
    this.ensureInitialized();
    return this.tools.size;
  }

  /**
   * 手动初始化（可选，通常不需要调用，会自动初始化）
   */
  initialize(): void {
    this.ensureInitialized();
  }
}

// 导出单例
export const mcpToolRegistry = MCPToolRegistry.getInstance();