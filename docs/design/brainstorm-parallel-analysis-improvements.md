# 脑洞模块：并行活动关联分析改进方案

## 1. 背景与目标

### 1.1 当前状态
- ✅ 单个脑洞分析功能（待实现完整）
- ✅ 父脑洞关联（parent_id）
- ✅ 关联实体字段（faction_ids, role_ids, geo_codes等）
- ✅ 分析结果存储（impact_analysis, consistency_check等）
- ❌ **缺少批量关联分析功能**
- ❌ **缺少并行活动脑洞的冲突检测**
- ❌ **缺少脑洞间协同效应分析**

### 1.2 改进目标
实现**并行活动脑洞的关联分析**，包括：
1. **识别并行活动脑洞**：基于状态、关联实体、时间等维度
2. **批量关联分析**：一次分析多个相关脑洞
3. **冲突检测**：检测并行活动脑洞之间的潜在冲突
4. **协同效应分析**：发现脑洞之间的协同机会
5. **可视化展示**：关联关系图、冲突热力图等

---

## 2. 核心概念定义

### 2.1 "并行活动脑洞"的定义

**并行活动脑洞**指在同一世界观下，满足以下条件之一的脑洞集合：

1. **状态维度**：`status = 'in_use'`（使用中）
2. **时间维度**：在同一时间段内创建/更新的脑洞（可配置时间窗口）
3. **关联维度**：共享相同关联实体的脑洞
   - 相同阵营（`related_faction_ids` 有交集）
   - 相同角色（`related_role_ids` 有交集）
   - 相同地理（`related_geo_codes` 有交集）
   - 相同世界态（`related_world_state_ids` 有交集）
4. **层级维度**：同一父脑洞下的子脑洞（`parent_id` 相同）
5. **标签维度**：共享相同标签的脑洞（`tags` 有交集）

### 2.2 关联分析类型

| 分析类型 | 说明 | 输出 |
|---------|------|------|
| **冲突检测** | 检测并行脑洞之间的逻辑冲突、设定矛盾 | 冲突列表（类型、严重程度、描述） |
| **协同效应** | 发现脑洞之间的协同机会、互补关系 | 协同建议（类型、潜力、描述） |
| **影响叠加** | 分析多个脑洞的叠加影响 | 叠加影响分析（实体、影响程度） |
| **一致性评分** | 评估并行脑洞集合的整体一致性 | 一致性评分（0-100） |
| **优先级建议** | 基于关联分析给出优先级建议 | 优先级调整建议 |

---

## 3. 技术方案设计

### 3.1 数据模型扩展

#### 3.1.1 新增类型定义

```typescript
// src/types/IAiNoval.ts

/** 并行活动脑洞关联分析结果 */
export interface IBrainstormParallelAnalysisResult {
  /** 分析的脑洞ID列表 */
  brainstorm_ids: number[];
  /** 关联类型（如何识别为并行活动） */
  relation_types: Array<'status' | 'time' | 'faction' | 'role' | 'geo' | 'world_state' | 'parent' | 'tag'>;
  /** 冲突检测结果 */
  conflicts?: Array<{
    brainstorm_ids: number[];  // 涉及哪些脑洞
    type: 'logical' | 'setting' | 'timeline' | 'character' | 'worldview';
    severity: 'low' | 'medium' | 'high';
    description: string;
    details?: string;
    suggested_resolution?: string;
  }>;
  /** 协同效应 */
  synergies?: Array<{
    brainstorm_ids: number[];
    type: 'complementary' | 'enhancement' | 'combination';
    potential: 'low' | 'medium' | 'high';
    description: string;
    suggested_action?: string;
  }>;
  /** 影响叠加分析 */
  impact_overlay?: {
    affected_entities: {
      factions?: Array<{ id: number; impact_level: 'low' | 'medium' | 'high'; description: string }>;
      roles?: Array<{ id: number; impact_level: 'low' | 'medium' | 'high'; description: string }>;
      world_states?: Array<{ id: number; impact_level: 'low' | 'medium' | 'high'; description: string }>;
    };
    overall_impact: 'low' | 'medium' | 'high';
    description: string;
  };
  /** 一致性评分 */
  consistency_score?: number;  // 0-100
  consistency_details?: string;
  /** 优先级建议 */
  priority_suggestions?: Array<{
    brainstorm_id: number;
    suggested_priority: Priority;
    reason: string;
  }>;
  /** 分析时间 */
  analyzed_at: Date;
  /** 使用的LLM模型 */
  analysis_model?: string;
}

/** 脑洞关联关系（用于可视化） */
export interface IBrainstormRelation {
  source_id: number;
  target_id: number;
  relation_type: 'parent' | 'sibling' | 'related_entity' | 'tag' | 'conflict' | 'synergy';
  strength?: number;  // 关联强度 0-1
  description?: string;
}
```

#### 3.1.2 数据库扩展（可选）

如果需要持久化关联分析结果：

```sql
-- 并行活动脑洞关联分析结果表
CREATE TABLE IF NOT EXISTS `brainstorm_parallel_analysis` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `worldview_id` bigint NOT NULL COMMENT '世界观ID',
  `brainstorm_ids` json NOT NULL COMMENT '分析的脑洞ID列表',
  `relation_types` json COMMENT '关联类型',
  `analysis_result` json NOT NULL COMMENT '分析结果',
  `analyzed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `analysis_model` varchar(100),
  PRIMARY KEY (`id`),
  KEY `idx_worldview_id` (`worldview_id`),
  KEY `idx_analyzed_at` (`analyzed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='并行活动脑洞关联分析结果表';
```

---

### 3.2 API设计

#### 3.2.1 识别并行活动脑洞

```typescript
// GET /api/web/aiNoval/brainstorm/parallel?worldview_id=xxx&criteria=...
// 或 POST /api/web/aiNoval/brainstorm/parallel/identify

interface IdentifyParallelBrainstormsParams {
  worldview_id: number;
  /** 识别标准 */
  criteria?: {
    /** 基于状态 */
    status?: BrainstormStatus | BrainstormStatus[];
    /** 基于时间窗口（天） */
    time_window_days?: number;
    /** 基于关联实体 */
    require_shared_entities?: {
      factions?: boolean;
      roles?: boolean;
      geos?: boolean;
      world_states?: boolean;
    };
    /** 基于父脑洞 */
    parent_id?: number;
    /** 基于标签 */
    require_shared_tags?: boolean;
    /** 最小关联强度（0-1） */
    min_relation_strength?: number;
  };
  /** 指定脑洞ID（可选，用于查找与指定脑洞相关的并行活动） */
  target_brainstorm_id?: number;
}
```

#### 3.2.2 批量关联分析

```typescript
// POST /api/web/aiNoval/brainstorm/parallel/analyze

interface AnalyzeParallelBrainstormsParams {
  worldview_id: number;
  brainstorm_ids: number[];
  /** 分析选项 */
  analysis_options?: {
    detect_conflicts?: boolean;
    detect_synergies?: boolean;
    analyze_impact_overlay?: boolean;
    calculate_consistency?: boolean;
    suggest_priorities?: boolean;
  };
  /** 分析方向（可选，类似单个脑洞的analysis_direction） */
  analysis_direction?: string;
}
```

#### 3.2.3 获取关联关系图

```typescript
// GET /api/web/aiNoval/brainstorm/relations?worldview_id=xxx&brainstorm_id=xxx

interface GetBrainstormRelationsParams {
  worldview_id: number;
  brainstorm_id?: number;  // 如果指定，返回与该脑洞相关的所有关系
  relation_types?: string[];  // 过滤关系类型
  max_depth?: number;  // 关系图最大深度
}
```

---

### 3.3 LLM分析流程设计

#### 3.3.1 分析流程

```
1. 收集并行活动脑洞信息
   ├─ 脑洞基础信息（title, content, analysis_direction）
   ├─ 关联实体信息（通过MCP获取faction/role/geo/world_state详情）
   └─ 已有分析结果（如果有）

2. 构建分析提示词
   ├─ 世界观上下文（worldbook）
   ├─ 世界态上下文（world_state）
   ├─ 阵营结构（faction_structure）
   └─ 并行脑洞集合

3. 调用LLM分析（DeepSeek + ReAct + MCP）
   ├─ 冲突检测：识别逻辑冲突、设定矛盾
   ├─ 协同分析：发现互补、增强关系
   ├─ 影响叠加：分析组合影响
   ├─ 一致性评估：整体一致性评分
   └─ 优先级建议：基于关联分析的建议

4. 解析并结构化结果
   └─ 输出 IBrainstormParallelAnalysisResult

5. 可选：持久化分析结果
```

#### 3.3.2 提示词设计要点

**System Prompt 示例**：
```
你是一个专业的脑洞关联分析专家。你的任务是分析一组并行活动的脑洞，识别它们之间的：
1. 冲突：逻辑矛盾、设定冲突、时间线冲突等
2. 协同：互补关系、增强效应、组合机会等
3. 影响叠加：多个脑洞组合后的综合影响
4. 一致性：整体一致性评分（0-100）

分析时需要考虑：
- 世界观设定的一致性
- 世界态的影响范围
- 阵营关系的合理性
- 角色行为的逻辑性
- 时间线的合理性

输出格式：JSON（IBrainstormParallelAnalysisResult）
```

---

### 3.4 前端UI设计

#### 3.4.1 新增组件

1. **并行活动脑洞识别面板** (`ParallelBrainstormSelector.tsx`)
   - 选择识别标准（状态、时间、关联实体等）
   - 显示识别到的并行活动脑洞列表
   - 支持手动添加/移除脑洞

2. **关联分析结果面板** (`ParallelAnalysisPanel.tsx`)
   - 冲突列表（按严重程度排序）
   - 协同效应列表
   - 影响叠加分析
   - 一致性评分展示
   - 优先级建议

3. **关联关系图** (`BrainstormRelationGraph.tsx`)
   - 使用图形库（如 vis-network 或 @antv/g6）展示关系图
   - 节点：脑洞
   - 边：关联关系（颜色区分类型，粗细表示强度）
   - 支持交互：点击节点查看详情，拖拽布局

4. **批量分析按钮**（集成到现有界面）
   - 在 `BrainstormList.tsx` 添加"批量关联分析"按钮
   - 在 `BrainstormEditModal.tsx` 添加"查找并行活动"按钮

#### 3.4.2 UI流程

```
用户操作流程：
1. 在脑洞列表中选择一个或多个脑洞
2. 点击"关联分析"按钮
3. 系统自动识别并行活动脑洞（或用户手动选择）
4. 显示识别结果，用户确认
5. 点击"开始分析"，调用批量分析API
6. 显示分析结果：
   - 冲突列表（红色高亮）
   - 协同效应（绿色高亮）
   - 影响叠加分析
   - 一致性评分
   - 优先级建议
7. 用户可查看关联关系图
8. 用户可根据建议调整脑洞（优先级、状态等）
```

---

## 4. 实施建议

### 4.1 分阶段实施

#### 阶段1：基础功能（MVP）
- ✅ 实现并行活动脑洞识别API（基于状态、关联实体）
- ✅ 实现批量关联分析API（冲突检测 + 协同分析）
- ✅ 前端：并行活动选择器 + 分析结果展示面板
- ⏱️ 预计工作量：3-5天

#### 阶段2：增强功能
- ✅ 关联关系图可视化
- ✅ 影响叠加分析
- ✅ 一致性评分
- ✅ 优先级建议
- ⏱️ 预计工作量：3-5天

#### 阶段3：高级功能
- ✅ 分析结果持久化
- ✅ 分析历史记录
- ✅ 智能推荐相关脑洞
- ✅ 自动冲突预警（新建/更新脑洞时）
- ⏱️ 预计工作量：5-7天

### 4.2 技术选型建议

1. **图形可视化**：
   - 推荐：`@antv/g6`（AntV生态，与Ant Design兼容性好）
   - 备选：`vis-network`（功能强大，但体积较大）

2. **LLM调用**：
   - 复用现有 `executeReAct` + `mcpToolRegistry` 模式
   - 参考 `brainstormExpandQuestions.ts` 的实现

3. **性能优化**：
   - 并行活动识别：使用数据库查询优化（索引、JOIN）
   - 批量分析：支持异步处理（队列），避免长时间阻塞
   - 缓存：分析结果可缓存（相同脑洞集合 + 相同分析选项）

---

## 5. 示例场景

### 场景1：检测冲突

**场景**：
- 脑洞A：主角加入阵营X
- 脑洞B：主角背叛阵营X
- 两个脑洞状态都是 `in_use`

**分析结果**：
```json
{
  "conflicts": [{
    "brainstorm_ids": [1, 2],
    "type": "logical",
    "severity": "high",
    "description": "脑洞A和B存在逻辑冲突：主角不能同时加入和背叛阵营X",
    "suggested_resolution": "建议调整时间顺序，或修改其中一个脑洞的设定"
  }]
}
```

### 场景2：发现协同

**场景**：
- 脑洞A：引入新角色Y
- 脑洞B：阵营X需要新成员
- 两个脑洞都关联阵营X

**分析结果**：
```json
{
  "synergies": [{
    "brainstorm_ids": [3, 4],
    "type": "complementary",
    "potential": "high",
    "description": "脑洞A和B可以结合：新角色Y可以加入阵营X，解决阵营X的人员需求",
    "suggested_action": "考虑将两个脑洞合并或建立明确的关联关系"
  }]
}
```

---

## 6. 总结

### 6.1 核心价值

1. **冲突预防**：在实施前发现潜在冲突，避免后期修改成本
2. **协同发现**：发现脑洞之间的协同机会，提升创作效率
3. **整体把控**：从全局视角评估并行活动的脑洞集合
4. **智能建议**：基于关联分析提供优先级和调整建议

### 6.2 关键设计点

1. **灵活的识别标准**：支持多种维度识别并行活动脑洞
2. **可扩展的分析类型**：支持冲突、协同、影响叠加等多种分析
3. **可视化展示**：关联关系图直观展示脑洞之间的关系
4. **LLM增强**：利用MCP工具获取世界观上下文，提升分析质量

### 6.3 后续扩展方向

1. **实时监控**：新建/更新脑洞时自动检测与并行活动的冲突
2. **智能推荐**：基于关联分析推荐相关脑洞
3. **历史分析**：记录分析历史，追踪脑洞关系变化
4. **协作功能**：多人协作时，提示团队成员注意并行活动的冲突

---

## 7. 相关文件清单

### 需要创建的文件
- `pages/api/web/aiNoval/brainstorm/parallel/identify.ts` - 识别并行活动脑洞API
- `pages/api/web/aiNoval/brainstorm/parallel/analyze.ts` - 批量关联分析API
- `pages/api/web/aiNoval/brainstorm/relations.ts` - 获取关联关系API
- `src/business/aiNoval/brainstormManage/components/ParallelBrainstormSelector.tsx` - 并行活动选择器
- `src/business/aiNoval/brainstormManage/components/ParallelAnalysisPanel.tsx` - 关联分析结果面板
- `src/business/aiNoval/brainstormManage/components/BrainstormRelationGraph.tsx` - 关联关系图组件
- `src/business/aiNoval/brainstormManage/apiCalls.ts` - 添加并行分析相关API调用

### 需要修改的文件
- `src/types/IAiNoval.ts` - 添加并行分析相关类型定义
- `src/business/aiNoval/brainstormManage/components/BrainstormList.tsx` - 添加批量分析按钮
- `src/business/aiNoval/brainstormManage/components/BrainstormEditModal.tsx` - 添加"查找并行活动"功能
- `src/services/aiNoval/brainstormService.js` - 添加并行活动查询方法（如需要）

---

**文档版本**：v1.0  
**创建日期**：2026-02-09  
**作者**：AI Assistant
