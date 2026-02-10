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
  
  /**
   * 规范化工具参数：MCP 客户端/模型常将 arguments 以 JSON 字符串形式传入，此处统一转为对象。
   * 返回 { ok: true, args } 或 { ok: false, error }。
   */
  private normalizeToolArgs(
    args: Record<string, any> | string | null | undefined
  ): { ok: true; args: Record<string, any> } | { ok: false; error: string } {
    if (args == null) return { ok: true, args: {} };
    if (typeof args === 'object' && !Array.isArray(args)) return { ok: true, args };
    if (typeof args === 'string') {
      try {
        const parsed = JSON.parse(args) as Record<string, any>;
        const obj = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
        return { ok: true, args: obj };
      } catch (e) {
        return { ok: false, error: 'arguments 为 JSON 字符串时解析失败，请传入合法 JSON 对象字符串，例如：{"worldview_id": 1}' };
      }
    }
    return { ok: true, args: {} };
  }

  // 执行工具
  async executeTool(
    name: string,
    args: Record<string, any> | string | null | undefined
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

    const normalized = this.normalizeToolArgs(args);
    if (!normalized.ok) {
      return {
        content: [{ type: 'text', text: `参数格式错误: ${normalized.error}` }],
        isError: true
      };
    }
    const normalizedArgs = normalized.args;

    // 验证参数
    const validationError = tool.validateArgs(normalizedArgs);
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
      return await tool.execute(normalizedArgs);
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