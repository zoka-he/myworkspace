// lib/mcp/tools/index.ts - 统一导出工具
import { ResolveEntityTool } from './tools/resolveEntity';
import { DecomposeCommandTool } from './tools/decomposeCommand';
import { FindGeoTool } from './tools/findGeo';
import { FindFactionTool } from './tools/findFaction';
import { FindRoleTool } from './tools/findRole';
import { BaseMCPTool } from './core/baseMcpTool';
import { FactionStructureTool } from './tools/factionStructure';
import { GeoStructureTool } from './tools/geoStructure';
import { WorldbookTool } from './tools/worldbook';

// 导出所有工具类
export {
  ResolveEntityTool,
  DecomposeCommandTool,
  FindGeoTool,
  FindFactionTool,
  FindRoleTool,
  FactionStructureTool,
  GeoStructureTool,
  WorldbookTool,
};

// 工具实例数组，方便批量注册
export const allTools: BaseMCPTool[] = [
  // new ResolveEntityTool(),
  // new DecomposeCommandTool(),
  new FindGeoTool(),
  new FindFactionTool(),
  new FindRoleTool(),
  new FactionStructureTool(),
  new GeoStructureTool(),
  new WorldbookTool(),
];