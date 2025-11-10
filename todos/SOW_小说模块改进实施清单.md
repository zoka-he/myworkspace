# 小说模块改进实施清单 (SOW)

> **项目目标**：基于现有代码架构，从专业写作角度增强小说创作辅助功能
> **基础架构**：Next.js + TypeScript + MySQL + Ant Design

---

## 📋 一、故事结构与情节规划模块

### 1.1 三幕剧结构支持

#### 1.1.1 数据库改动
**文件**：`src/services/novel_structure.sql`（新建）

```sql
-- 小说幕结构表
CREATE TABLE IF NOT EXISTS `novel_acts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `novel_id` bigint NOT NULL COMMENT '小说ID',
  `act_number` int NOT NULL COMMENT '幕编号（1-3）',
  `act_name` varchar(100) NOT NULL COMMENT '幕名称',
  `start_chapter_number` int NOT NULL COMMENT '起始章节号',
  `end_chapter_number` int NOT NULL COMMENT '结束章节号',
  `description` text COMMENT '幕描述',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_novel_id` (`novel_id`),
  KEY `idx_act_number` (`act_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='小说幕结构表';

-- 章节功能标签表（多对多）
CREATE TABLE IF NOT EXISTS `chapter_function_tags` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `chapter_id` bigint NOT NULL,
  `tag_type` varchar(50) NOT NULL COMMENT '标签类型：exposition/rising-action/climax等',
  `tag_name` varchar(100) NOT NULL COMMENT '标签名称',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chapter_id` (`chapter_id`),
  KEY `idx_tag_type` (`tag_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='章节功能标签表';
```

**工作量**：0.5天

---

#### 1.1.2 TypeScript类型定义
**文件**：`src/types/IAiNoval.ts`（修改）

```typescript
// 新增接口
export interface INovelAct {
    id?: number;
    novel_id?: number;
    act_number?: number;
    act_name?: string;
    start_chapter_number?: number;
    end_chapter_number?: number;
    description?: string;
}

export interface IChapterFunctionTag {
    id?: number;
    chapter_id?: number;
    tag_type?: 'exposition' | 'rising-action' | 'climax' | 'falling-action' | 'resolution' 
              | 'character-intro' | 'world-building' | 'plot-twist' | 'character-growth';
    tag_name?: string;
}

// 扩展IChapter接口
// 在现有IChapter接口中添加：
// function_tags?: IChapterFunctionTag[];
// act_id?: number;
```

**工作量**：0.5天

---

#### 1.1.3 后端API接口
**文件**：`pages/api/aiNoval/novel/acts.ts`（新建）

```typescript
// GET /api/aiNoval/novel/acts?novelId=xxx
// POST /api/aiNoval/novel/acts
// PUT /api/aiNoval/novel/acts?id=xxx
// DELETE /api/aiNoval/novel/acts?id=xxx
```

**文件**：`pages/api/aiNoval/chapters/tags.ts`（新建）

```typescript
// GET /api/aiNoval/chapters/tags?chapterId=xxx
// POST /api/aiNoval/chapters/tags
// DELETE /api/aiNoval/chapters/tags?id=xxx
```

**工作量**：1.5天

---

#### 1.1.4 前端组件
**文件**：`src/business/aiNoval/novalManage/components/NovelActEditor.tsx`（新建）

功能：
- 幕结构编辑表单（幕编号、名称、起止章节）
- 幕结构可视化（时间轴展示）
- 与章节列表联动

**文件**：`src/business/aiNoval/chapterManage/components/ChapterTagPanel.tsx`（新建）

功能：
- 章节功能标签选择器（多选）
- 标签预设选项（exposition/rising-action/climax等）
- 标签统计展示

**工作量**：2天

---

**总计工作量**：4.5天 | **优先级**：P1（高） | **依赖**：无

---

### 1.2 冲突类型管理

#### 1.2.1 数据库改动
**文件**：`src/services/timeline.sql`（修改）

```sql
-- 在timeline_events表中添加字段
ALTER TABLE `timeline_events` 
ADD COLUMN `conflict_type` varchar(50) DEFAULT NULL COMMENT '冲突类型：person-vs-person/person-vs-nature/person-vs-society/person-vs-self/person-vs-technology',
ADD INDEX `idx_conflict_type` (`conflict_type`);
```

**工作量**：0.3天

---

#### 1.2.2 TypeScript类型定义
**文件**：`src/types/IAiNoval.ts`（修改）

```typescript
// 扩展ITimelineEvent接口
export interface ITimelineEvent {
    // ... 现有字段
    conflict_type?: 'person-vs-person' | 'person-vs-nature' | 'person-vs-society' | 'person-vs-self' | 'person-vs-technology';
}

// 常量定义
export const CONFLICT_TYPES = [
    { value: 'person-vs-person', label: '人 vs 人', color: 'red' },
    { value: 'person-vs-nature', label: '人 vs 自然', color: 'green' },
    { value: 'person-vs-society', label: '人 vs 社会', color: 'blue' },
    { value: 'person-vs-self', label: '人 vs 自我', color: 'purple' },
    { value: 'person-vs-technology', label: '人 vs 技术/超自然', color: 'orange' }
];
```

**工作量**：0.3天

---

#### 1.2.3 前端组件
**文件**：`src/business/aiNoval/eventManage/components/EventEditPanel.tsx`（修改）

在事件编辑面板中添加冲突类型选择器：
- Select组件，选项来自CONFLICT_TYPES常量
- 可选字段，默认值为null

**工作量**：0.5天

---

**总计工作量**：1.1天 | **优先级**：P2（中） | **依赖**：无

---

## 📋 二、角色塑造与人物弧模块

### 2.1 角色动机与目标追踪

#### 2.1.1 数据库改动
**文件**：`src/services/role.sql`（新建或修改）

```sql
-- 角色信息表扩展（role_info）
-- 如果表已存在，使用ALTER TABLE添加字段
ALTER TABLE `role_info` 
ADD COLUMN `core_motivation` text COMMENT '核心动机',
ADD COLUMN `short_term_goal` text COMMENT '短期目标',
ADD COLUMN `long_term_goal` text COMMENT '长期目标',
ADD COLUMN `inner_conflict` text COMMENT '内在矛盾';
```

**工作量**：0.3天

---

#### 2.1.2 TypeScript类型定义
**文件**：`src/types/IAiNoval.ts`（修改）

```typescript
// 扩展IRoleInfo接口
export interface IRoleInfo {
    // ... 现有字段
    core_motivation?: string;
    short_term_goal?: string;
    long_term_goal?: string;
    inner_conflict?: string;
}
```

**工作量**：0.2天

---

#### 2.1.3 前端组件
**文件**：`src/business/aiNoval/roleManage/edit/roleInfoEditModal.tsx`（修改）

在角色信息编辑表单中添加：
- TextArea组件：核心动机
- TextArea组件：短期目标
- TextArea组件：长期目标
- TextArea组件：内在矛盾

**工作量**：0.5天

---

**总计工作量**：1天 | **优先级**：P1（高） | **依赖**：无

---

### 2.2 角色成长弧线追踪

#### 2.2.1 数据库改动
**文件**：`src/services/role_arc.sql`（新建）

```sql
-- 角色成长节点表
CREATE TABLE IF NOT EXISTS `role_growth_nodes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `role_id` bigint NOT NULL COMMENT '角色ID',
  `chapter_id` bigint DEFAULT NULL COMMENT '关联章节ID',
  `event_id` bigint DEFAULT NULL COMMENT '关联事件ID',
  `node_type` varchar(50) NOT NULL COMMENT '节点类型：start/turning-point/milestone/end',
  `growth_description` text NOT NULL COMMENT '成长描述',
  `character_state` text COMMENT '角色状态（改变前/改变后）',
  `timestamp` bigint DEFAULT NULL COMMENT '时间戳（秒）',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_role_id` (`role_id`),
  KEY `idx_chapter_id` (`chapter_id`),
  KEY `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色成长节点表';
```

**工作量**：0.5天

---

#### 2.2.2 TypeScript类型定义
**文件**：`src/types/IAiNoval.ts`（新增）

```typescript
export interface IRoleGrowthNode {
    id?: number;
    role_id?: number;
    chapter_id?: number;
    event_id?: number;
    node_type?: 'start' | 'turning-point' | 'milestone' | 'end';
    growth_description?: string;
    character_state?: string;
    timestamp?: number;
}
```

**工作量**：0.3天

---

#### 2.2.3 后端API接口
**文件**：`pages/api/aiNoval/role/growthNodes.ts`（新建）

```typescript
// GET /api/aiNoval/role/growthNodes?roleId=xxx
// POST /api/aiNoval/role/growthNodes
// PUT /api/aiNoval/role/growthNodes?id=xxx
// DELETE /api/aiNoval/role/growthNodes?id=xxx
```

**工作量**：1天

---

#### 2.2.4 前端组件
**文件**：`src/business/aiNoval/roleManage/components/RoleArcPanel.tsx`（新建）

功能：
- 角色成长节点列表
- 成长弧线可视化（使用D3.js或ECharts，参考现有的d3RoleRelationGraph）
- 时间线展示角色成长过程
- 节点添加/编辑/删除功能

**工作量**：3天

---

**总计工作量**：4.8天 | **优先级**：P1（高） | **依赖**：无

---

### 2.3 角色档案完整性检查

#### 2.3.1 工具函数
**文件**：`src/business/aiNoval/roleManage/utils/roleCompletenessCheck.ts`（新建）

```typescript
export interface IRoleCompleteness {
    score: number; // 0-100
    missingFields: string[];
    warnings: string[];
}

export function checkRoleCompleteness(roleInfo: IRoleInfo): IRoleCompleteness {
    // 检查必填字段：background, personality, core_motivation等
    // 返回完整性评分和缺失字段列表
}
```

**工作量**：0.5天

---

#### 2.3.2 前端组件
**文件**：`src/business/aiNoval/roleManage/panel/roleInfoPanel.tsx`（修改）

在角色信息面板中添加完整性检查展示：
- 完整性评分进度条
- 缺失字段警告列表
- 一键跳转编辑按钮

**工作量**：1天

---

**总计工作量**：1.5天 | **优先级**：P2（中） | **依赖**：2.1完成

---

## 📋 三、世界观一致性与细节模块

### 3.1 世界观规则手册功能

#### 3.1.1 数据库改动
**文件**：`src/services/worldview_rules.sql`（新建）

```sql
-- 世界观规则表
CREATE TABLE IF NOT EXISTS `worldview_rules` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `worldview_id` bigint NOT NULL COMMENT '世界观ID',
  `rule_type` varchar(50) NOT NULL COMMENT '规则类型：physics/magic/society/time/other',
  `rule_category` varchar(100) NOT NULL COMMENT '规则分类',
  `rule_name` varchar(255) NOT NULL COMMENT '规则名称',
  `rule_description` text NOT NULL COMMENT '规则描述',
  `rule_examples` text COMMENT '规则示例',
  `priority` int DEFAULT 0 COMMENT '优先级',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_worldview_id` (`worldview_id`),
  KEY `idx_rule_type` (`rule_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='世界观规则表';
```

**工作量**：0.5天

---

#### 3.1.2 TypeScript类型定义
**文件**：`src/types/IAiNoval.ts`（新增）

```typescript
export interface IWorldViewRule {
    id?: number;
    worldview_id?: number;
    rule_type?: 'physics' | 'magic' | 'society' | 'time' | 'other';
    rule_category?: string;
    rule_name?: string;
    rule_description?: string;
    rule_examples?: string;
    priority?: number;
}
```

**工作量**：0.3天

---

#### 3.1.3 后端API接口
**文件**：`pages/api/aiNoval/worldView/rules.ts`（新建）

```typescript
// GET /api/aiNoval/worldView/rules?worldviewId=xxx
// POST /api/aiNoval/worldView/rules
// PUT /api/aiNoval/worldView/rules?id=xxx
// DELETE /api/aiNoval/worldView/rules?id=xxx
```

**工作量**：1天

---

#### 3.1.4 前端组件
**文件**：`src/business/aiNoval/worldViewManage/components/WorldViewRulesPanel.tsx`（新建）

功能：
- 规则列表（按类型分类）
- 规则添加/编辑/删除
- 规则搜索和筛选
- 规则与章节内容一致性检查（调用API）

**工作量**：2.5天

---

#### 3.1.5 一致性检查API
**文件**：`pages/api/aiNoval/worldView/checkConsistency.ts`（新建）

功能：
- 检查章节内容是否违反世界观规则
- 使用AI分析章节文本，匹配规则关键词
- 返回违规列表和建议

**工作量**：2天（需要AI集成）

---

**总计工作量**：6.3天 | **优先级**：P2（中） | **依赖**：无

---

### 3.2 专有名词词典

#### 3.2.1 数据库改动
**文件**：`src/services/worldview_glossary.sql`（新建）

```sql
-- 专有名词词典表
CREATE TABLE IF NOT EXISTS `worldview_glossary` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `worldview_id` bigint NOT NULL COMMENT '世界观ID',
  `term_type` varchar(50) NOT NULL COMMENT '词条类型：location/person/item/ability/concept',
  `term_name` varchar(255) NOT NULL COMMENT '词条名称',
  `term_alias` varchar(255) COMMENT '别名（逗号分隔）',
  `term_definition` text NOT NULL COMMENT '词条定义',
  `first_appear_chapter_id` bigint DEFAULT NULL COMMENT '首次出现章节ID',
  `usage_count` int DEFAULT 0 COMMENT '使用次数',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_worldview_id` (`worldview_id`),
  KEY `idx_term_type` (`term_type`),
  KEY `idx_term_name` (`term_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='专有名词词典表';
```

**工作量**：0.5天

---

#### 3.2.2 TypeScript类型定义
**文件**：`src/types/IAiNoval.ts`（新增）

```typescript
export interface IWorldViewGlossary {
    id?: number;
    worldview_id?: number;
    term_type?: 'location' | 'person' | 'item' | 'ability' | 'concept';
    term_name?: string;
    term_alias?: string;
    term_definition?: string;
    first_appear_chapter_id?: number;
    usage_count?: number;
}
```

**工作量**：0.3天

---

#### 3.2.3 后端API接口
**文件**：`pages/api/aiNoval/worldView/glossary.ts`（新建）

```typescript
// GET /api/aiNoval/worldView/glossary?worldviewId=xxx
// POST /api/aiNoval/worldView/glossary
// PUT /api/aiNoval/worldView/glossary?id=xxx
// DELETE /api/aiNoval/worldView/glossary?id=xxx

// POST /api/aiNoval/worldView/glossary/extract
// 从章节内容中提取专有名词（调用AI）
```

**工作量**：1.5天

---

#### 3.2.4 前端组件
**文件**：`src/business/aiNoval/worldViewManage/components/GlossaryPanel.tsx`（新建）

功能：
- 词条列表（按类型分类）
- 词条添加/编辑/删除
- 从章节内容自动提取专有名词
- 词条在章节中的使用情况统计

**工作量**：2天

---

#### 3.2.5 章节编辑集成
**文件**：`src/business/aiNoval/chapterManage/components/ChapterGeneratePanel.tsx`（修改）

在章节内容编辑器中添加：
- 专有名词高亮显示
- 鼠标悬停显示词条定义
- 拼写一致性检查提示

**工作量**：1.5天

---

**总计工作量**：5.8天 | **优先级**：P1（高） | **依赖**：无

---

## 📋 四、写作流程与效率模块

### 4.1 章节大纲模板库

#### 4.1.1 数据库改动
**文件**：`src/services/chapter_templates.sql`（新建）

```sql
-- 章节大纲模板表
CREATE TABLE IF NOT EXISTS `chapter_templates` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `template_name` varchar(255) NOT NULL COMMENT '模板名称',
  `template_type` varchar(50) NOT NULL COMMENT '模板类型：action/dialogue/description/twist',
  `template_content` text NOT NULL COMMENT '模板内容（JSON格式）',
  `template_description` text COMMENT '模板描述',
  `is_public` tinyint(1) DEFAULT 0 COMMENT '是否公开（0-私有，1-公开）',
  `created_by` bigint DEFAULT NULL COMMENT '创建者ID',
  `usage_count` int DEFAULT 0 COMMENT '使用次数',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_template_type` (`template_type`),
  KEY `idx_is_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='章节大纲模板表';
```

**工作量**：0.5天

---

#### 4.1.2 TypeScript类型定义
**文件**：`src/types/IAiNoval.ts`（新增）

```typescript
export interface IChapterTemplate {
    id?: number;
    template_name?: string;
    template_type?: 'action' | 'dialogue' | 'description' | 'twist';
    template_content?: string; // JSON字符串
    template_description?: string;
    is_public?: boolean;
    created_by?: number;
    usage_count?: number;
}
```

**工作量**：0.3天

---

#### 4.1.3 后端API接口
**文件**：`pages/api/aiNoval/chapters/templates.ts`（新建）

```typescript
// GET /api/aiNoval/chapters/templates?type=xxx&isPublic=1
// POST /api/aiNoval/chapters/templates
// PUT /api/aiNoval/chapters/templates?id=xxx
// DELETE /api/aiNoval/chapters/templates?id=xxx
// POST /api/aiNoval/chapters/templates/apply?templateId=xxx&chapterId=xxx
```

**工作量**：1.5天

---

#### 4.1.4 前端组件
**文件**：`src/business/aiNoval/chapterManage/components/ChapterTemplatePanel.tsx`（新建）

功能：
- 模板列表（按类型筛选）
- 模板预览
- 模板应用到章节
- 自定义模板保存

**文件**：`src/business/aiNoval/chapterManage/components/ChapterSkeletonPanel.tsx`（修改）

在章节骨架面板中添加：
- "使用模板"按钮
- 模板选择对话框

**工作量**：2.5天

---

**总计工作量**：4.8天 | **优先级**：P2（中） | **依赖**：无

---

### 4.2 提示词模板化与库管理

#### 4.2.1 数据库改动
**文件**：`src/services/prompt_templates.sql`（新建）

```sql
-- 提示词模板表
CREATE TABLE IF NOT EXISTS `prompt_templates` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `template_name` varchar(255) NOT NULL COMMENT '模板名称',
  `template_category` varchar(50) NOT NULL COMMENT '模板分类：worldview/role/plot/scene',
  `template_content` text NOT NULL COMMENT '模板内容（支持变量替换）',
  `template_variables` text COMMENT '模板变量说明（JSON）',
  `template_description` text COMMENT '模板描述',
  `usage_example` text COMMENT '使用示例',
  `is_public` tinyint(1) DEFAULT 0 COMMENT '是否公开',
  `rating_score` decimal(3,2) DEFAULT 0 COMMENT '评分（0-5）',
  `usage_count` int DEFAULT 0 COMMENT '使用次数',
  `created_by` bigint DEFAULT NULL COMMENT '创建者ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_template_category` (`template_category`),
  KEY `idx_is_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提示词模板表';
```

**工作量**：0.5天

---

#### 4.2.2 TypeScript类型定义
**文件**：`src/types/IAiNoval.ts`（新增）

```typescript
export interface IPromptTemplate {
    id?: number;
    template_name?: string;
    template_category?: 'worldview' | 'role' | 'plot' | 'scene';
    template_content?: string;
    template_variables?: Record<string, string>; // 变量名 -> 说明
    template_description?: string;
    usage_example?: string;
    is_public?: boolean;
    rating_score?: number;
    usage_count?: number;
    created_by?: number;
}
```

**工作量**：0.3天

---

#### 4.2.3 工具函数
**文件**：`src/business/aiNoval/common/promptTemplateUtil.ts`（新建）

```typescript
export function parseTemplateVariables(template: string): string[] {
    // 解析模板中的变量，如 {{character_name}}, {{location}}等
}

export function applyTemplate(template: string, variables: Record<string, string>): string {
    // 应用变量替换
}
```

**工作量**：0.5天

---

#### 4.2.4 后端API接口
**文件**：`pages/api/aiNoval/prompts/templates.ts`（新建）

```typescript
// GET /api/aiNoval/prompts/templates?category=xxx&isPublic=1
// POST /api/aiNoval/prompts/templates
// PUT /api/aiNoval/prompts/templates?id=xxx
// DELETE /api/aiNoval/prompts/templates?id=xxx
// POST /api/aiNoval/prompts/templates/rate?id=xxx&score=5
```

**工作量**：1.5天

---

#### 4.2.5 前端组件
**文件**：`src/business/aiNoval/toolsConfig/components/PromptTemplatePanel.tsx`（新建）

功能：
- 模板库浏览（按分类）
- 模板搜索
- 模板预览和编辑
- 变量替换界面
- 模板评分功能

**文件**：`src/business/aiNoval/chapterManage/components/ChapterSkeletonPanel.tsx`（修改）

在提示词输入框中添加：
- "从模板选择"按钮
- 模板选择对话框
- 变量填写表单

**工作量**：3天

---

**总计工作量**：5.8天 | **优先级**：P1（高） | **依赖**：无

---

## 📋 五、叙事技巧与文风模块

### 5.1 伏笔与呼应追踪

#### 5.1.1 数据库改动
**文件**：`src/services/foreshadowing.sql`（新建）

```sql
-- 伏笔表
CREATE TABLE IF NOT EXISTS `foreshadowing` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `novel_id` bigint NOT NULL COMMENT '小说ID',
  `worldview_id` bigint DEFAULT NULL COMMENT '世界观ID',
  `foreshadow_chapter_id` bigint NOT NULL COMMENT '伏笔章节ID',
  `foreshadow_content` text NOT NULL COMMENT '伏笔内容',
  `foreshadow_type` varchar(50) DEFAULT NULL COMMENT '伏笔类型：plot/character/item/event',
  `payoff_chapter_id` bigint DEFAULT NULL COMMENT '呼应章节ID（可为空，表示未呼应）',
  `payoff_content` text COMMENT '呼应内容',
  `status` varchar(20) DEFAULT 'active' COMMENT '状态：active/resolved/unresolved',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_novel_id` (`novel_id`),
  KEY `idx_foreshadow_chapter_id` (`foreshadow_chapter_id`),
  KEY `idx_payoff_chapter_id` (`payoff_chapter_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='伏笔表';
```

**工作量**：0.5天

---

#### 5.1.2 TypeScript类型定义
**文件**：`src/types/IAiNoval.ts`（新增）

```typescript
export interface IForeshadowing {
    id?: number;
    novel_id?: number;
    worldview_id?: number;
    foreshadow_chapter_id?: number;
    foreshadow_content?: string;
    foreshadow_type?: 'plot' | 'character' | 'item' | 'event';
    payoff_chapter_id?: number;
    payoff_content?: string;
    status?: 'active' | 'resolved' | 'unresolved';
}
```

**工作量**：0.3天

---

#### 5.1.3 后端API接口
**文件**：`pages/api/aiNoval/foreshadowing.ts`（新建）

```typescript
// GET /api/aiNoval/foreshadowing?novelId=xxx&status=active
// POST /api/aiNoval/foreshadowing
// PUT /api/aiNoval/foreshadowing?id=xxx
// DELETE /api/aiNoval/foreshadowing?id=xxx
// POST /api/aiNoval/foreshadowing/link?id=xxx&payoffChapterId=xxx
```

**工作量**：1.5天

---

#### 5.1.4 前端组件
**文件**：`src/business/aiNoval/novalManage/components/ForeshadowingPanel.tsx`（新建）

功能：
- 伏笔列表（按状态筛选）
- 伏笔-呼应关系图（使用D3.js）
- 伏笔添加/编辑/删除
- 未呼应伏笔警告

**工作量**：3天

---

**总计工作量**：5.3天 | **优先级**：P2（中） | **依赖**：无

---

### 5.2 叙述节奏分析

#### 5.2.1 工具函数
**文件**：`src/business/aiNoval/chapterManage/utils/narrativeRhythmAnalyzer.ts`（新建）

```typescript
export interface INarrativeRhythm {
    dialogueRatio: number; // 对话比例
    narrationRatio: number; // 叙述比例
    actionRatio: number; // 动作比例
    descriptionRatio: number; // 描写比例
    chapterLength: number; // 章节长度（字数）
    keyPointDensity: number; // 关键情节点密度
}

export function analyzeNarrativeRhythm(content: string): INarrativeRhythm {
    // 分析章节内容的叙述节奏
    // 使用正则表达式或NLP库识别对话、叙述、动作、描写
}
```

**工作量**：1.5天

---

#### 5.2.2 前端组件
**文件**：`src/business/aiNoval/chapterManage/components/NarrativeRhythmPanel.tsx`（新建）

功能：
- 叙述节奏可视化（饼图、柱状图）
- 章节长度统计
- 与平均值的对比
- 节奏优化建议

**工作量**：2天

---

#### 5.2.3 章节管理集成
**文件**：`src/business/aiNoval/chapterManage/components/ChapterGeneratePanel.tsx`（修改）

添加"节奏分析"按钮，打开NarrativeRhythmPanel面板

**工作量**：0.5天

---

**总计工作量**：4天 | **优先级**：P3（低） | **依赖**：无

---

### 5.3 POV（视角）管理

#### 5.3.1 数据库改动
**文件**：`src/services/chapter.sql`（修改）

```sql
-- 在chapters表中添加字段
ALTER TABLE `chapters` 
ADD COLUMN `pov_type` varchar(20) DEFAULT NULL COMMENT '视角类型：first-person/third-person/omniscient',
ADD COLUMN `pov_character_id` bigint DEFAULT NULL COMMENT 'POV角色ID（第三人称限制视角）',
ADD INDEX `idx_pov_type` (`pov_type`),
ADD INDEX `idx_pov_character_id` (`pov_character_id`);
```

**工作量**：0.3天

---

#### 5.3.2 TypeScript类型定义
**文件**：`src/types/IAiNoval.ts`（修改）

```typescript
// 扩展IChapter接口
export interface IChapter {
    // ... 现有字段
    pov_type?: 'first-person' | 'third-person' | 'omniscient';
    pov_character_id?: number;
}
```

**工作量**：0.2天

---

#### 5.3.3 前端组件
**文件**：`src/business/aiNoval/chapterManage/components/ChapterSkeletonPanel.tsx`（修改）

在章节骨架表单中添加：
- POV类型选择器（Select）
- POV角色选择器（当选择third-person时显示）

**工作量**：0.5天

---

#### 5.3.4 一致性检查
**文件**：`src/business/aiNoval/chapterManage/utils/povConsistencyCheck.ts`（新建）

检查章节间POV切换的合理性：
- POV切换频率分析
- 不合理切换警告

**工作量**：1天

---

**总计工作量**：2天 | **优先级**：P2（中） | **依赖**：无

---

## 📋 六、创作辅助工具模块

### 6.1 情感色调分析

#### 6.1.1 工具函数
**文件**：`src/business/aiNoval/chapterManage/utils/emotionToneAnalyzer.ts`（新建）

```typescript
export interface IEmotionTone {
    dominant_emotion: 'tension' | 'sadness' | 'joy' | 'fear' | 'anger' | 'neutral';
    emotion_scores: Record<string, number>;
    tone_consistency: number; // 与相邻章节的色调一致性（0-1）
}

export function analyzeEmotionTone(content: string): IEmotionTone {
    // 使用AI或NLP库分析文本情感色调
    // 可以调用现有的AI API
}
```

**工作量**：1.5天

---

#### 6.1.2 前端组件
**文件**：`src/business/aiNoval/chapterManage/components/EmotionTonePanel.tsx`（新建）

功能：
- 情感色调可视化（雷达图）
- 章节情感曲线图
- 相邻章节情感对比
- 情感单调警告

**工作量**：2天

---

**总计工作量**：3.5天 | **优先级**：P3（低） | **依赖**：AI服务

---

### 6.2 内容质量评估

#### 6.2.1 工具函数
**文件**：`src/business/aiNoval/chapterManage/utils/contentQualityChecker.ts`（新建）

```typescript
export interface IContentQuality {
    overall_score: number; // 0-100
    plot_consistency: number;
    character_consistency: number;
    world_building_consistency: number;
    pacing_score: number;
    issues: Array<{
        type: 'plot' | 'character' | 'worldview' | 'pacing';
        severity: 'error' | 'warning' | 'info';
        message: string;
        suggestion: string;
    }>;
}

export async function checkContentQuality(chapter: IChapter, novel: INovalData): Promise<IContentQuality> {
    // 综合检查章节质量
    // 调用多个检查函数
}
```

**工作量**：2天

---

#### 6.2.2 前端组件
**文件**：`src/business/aiNoval/chapterManage/components/ContentQualityPanel.tsx`（新建）

功能：
- 质量评分展示（总分 + 分项）
- 问题列表（按严重程度分类）
- 修复建议
- 一键跳转到问题位置

**工作量**：2天

---

**总计工作量**：4天 | **优先级**：P2（中） | **依赖**：多个检查工具

---

## 📋 七、实施优先级与排期建议

### 7.1 优先级分级

**P1（高优先级）- 核心功能，立即实施**
1. 三幕剧结构支持（4.5天）
2. 角色动机与目标追踪（1天）
3. 角色成长弧线追踪（4.8天）
4. 专有名词词典（5.8天）
5. 提示词模板化与库管理（5.8天）

**P2（中优先级）- 重要功能，近期实施**
6. 冲突类型管理（1.1天）
7. 角色档案完整性检查（1.5天）
8. 世界观规则手册功能（6.3天）
9. POV（视角）管理（2天）
10. 伏笔与呼应追踪（5.3天）
11. 内容质量评估（4天）

**P3（低优先级）- 锦上添花，后续实施**
12. 章节大纲模板库（4.8天）
13. 叙述节奏分析（4天）
14. 情感色调分析（3.5天）

---

### 7.2 实施建议

#### 第一阶段（2周）- 核心功能快速迭代
- 三幕剧结构支持
- 角色动机与目标追踪
- 专有名词词典（核心功能）

**总工作量**：11.3天

#### 第二阶段（2周）- 角色与世界观完善
- 角色成长弧线追踪
- 提示词模板化
- 世界观规则手册

**总工作量**：18.9天

#### 第三阶段（2周）- 叙事技巧增强
- 伏笔与呼应追踪
- POV管理
- 内容质量评估

**总工作量**：11.3天

#### 第四阶段（1周）- 辅助工具
- 叙述节奏分析
- 情感色调分析
- 章节大纲模板库（可选）

**总工作量**：11.3天（可选）

---

### 7.3 依赖关系图

```
无依赖：
- 三幕剧结构支持
- 冲突类型管理
- 角色动机与目标追踪
- 角色成长弧线追踪
- 世界观规则手册功能
- 专有名词词典
- 章节大纲模板库
- 提示词模板化
- 伏笔与呼应追踪
- POV管理

有依赖：
- 角色档案完整性检查 → 依赖：角色动机与目标追踪
```

---

## 📋 八、技术实现注意事项

### 8.1 数据库迁移
- 所有ALTER TABLE操作需要编写回滚SQL
- 新增表需要创建索引优化查询性能
- 考虑数据迁移脚本（如果有现有数据）

### 8.2 API接口规范
- 统一错误码和错误信息格式
- 接口版本控制（如 `/api/v1/aiNoval/...`）
- 分页参数统一：`page`, `limit`
- 筛选参数统一格式

### 8.3 前端组件复用
- 参考现有的 `roleInfoEditModal.tsx` 模式
- 复用现有的 `apiCalls.ts` 模式
- 参考现有的D3图表组件（如 `d3RoleRelationGraph.tsx`）

### 8.4 AI集成
- 提示词模板应用需要使用现有的Dify工作流
- 一致性检查可以调用现有的AI API
- 注意API调用超时和错误处理

### 8.5 性能优化
- 大数据量列表需要虚拟滚动
- 图表渲染考虑使用 `useMemo` 优化
- API请求考虑缓存策略

---

## 📋 九、验收标准

### 9.1 功能完整性
- ✅ 所有数据库表创建成功
- ✅ 所有API接口正常工作
- ✅ 前端组件功能完整，无报错
- ✅ 数据保存和读取正常

### 9.2 用户体验
- ✅ 界面操作流畅，无明显卡顿
- ✅ 错误提示清晰明确
- ✅ 数据可视化清晰美观
- ✅ 移动端适配（如需要）

### 9.3 代码质量
- ✅ TypeScript类型定义完整
- ✅ 代码注释清晰
- ✅ 遵循现有代码规范
- ✅ 无ESLint/TSLint错误

---

## 📋 十、风险评估

### 10.1 技术风险
- **AI API不稳定**：需要完善的错误处理和重试机制
- **大数据量性能问题**：需要优化查询和前端渲染
- **数据库迁移风险**：需要充分测试和备份

### 10.2 时间风险
- 部分功能（如AI集成）可能超时
- 建议预留20%的缓冲时间

### 10.3 兼容性风险
- 数据库迁移可能影响现有功能
- 需要充分测试现有功能不受影响

---

## 📋 总计

- **总工作量估算**：约60天（不含测试和优化）
- **建议周期**：6-8周（包含测试和优化）
- **人员配置**：1-2名全栈开发工程师

---

*本SOW清单基于现有代码结构分析制定，实施过程中可根据实际情况调整优先级和时间安排。*

