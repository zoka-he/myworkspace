// lib/mcp/tools/index.ts - 统一导出工具
import { ResolveEntityTool } from './tools/resolveEntity';
import { DecomposeCommandTool } from './tools/decomposeCommand';
import { BaseMCPTool } from './core/baseMcpTool';

// 导出所有工具类
export { ResolveEntityTool, DecomposeCommandTool };

// 工具实例数组，方便批量注册
export const testTools: BaseMCPTool[] = [
  new ResolveEntityTool(),
  new DecomposeCommandTool(),
  // 未来添加新工具只需在这里加入即可
];