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
import { MagicSystemTool } from './tools/magicSystem';
import { WorldStateTool } from './tools/worldState';

// 导出所有工具类
export {
  // ResolveEntityTool,
  // DecomposeCommandTool,
  WorldbookTool,
  WorldStateTool,
  MagicSystemTool,
  FactionStructureTool,
  GeoStructureTool,
  FindGeoTool,
  FindFactionTool,
  FindRoleTool,
};

// 工具实例数组，方便批量注册
export const allTools: BaseMCPTool[] = [
  // new ResolveEntityTool(),
  // new DecomposeCommandTool(),
  new WorldbookTool(),
  new WorldStateTool(),
  new MagicSystemTool(),
  new FactionStructureTool(),
  new GeoStructureTool(),
  new FindGeoTool(),
  new FindFactionTool(),
  new FindRoleTool(),
  // expand_cultural_style  --> 扩展文化风格(半固定，负责把文化翻译成语言风格)
  // derive_naming_and_language_rules  --> 根据阵营特质反推命名和语言规则
  // world_state_snapshot --> 世界状态快照(负责生成世界状态快照)
  // event_causality_graph --> 事件因果图(负责生成事件因果图)
  // faction_long_term_intent --> 阵营长期意图(负责生成阵营长期意图)
  // perspective_visibility_filter --> 视角可见性过滤(负责生成视角可见性过滤)
  // event_escalation_model --> 事件升级模型(负责生成事件升级模型)
];