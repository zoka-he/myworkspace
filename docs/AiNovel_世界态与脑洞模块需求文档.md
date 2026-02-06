# AiNovel 世界态与脑洞模块需求文档

> **文档版本**: v1.0  
> **创建日期**: 2026-02-06  
> **项目**: Next.js + TypeScript + MySQL + Ant Design

---

## 📋 目录

1. [项目背景](#项目背景)
2. [模块一：世界态模块](#模块一世界态模块)
3. [模块二：脑洞模块](#模块二脑洞模块)
4. [可行性分析](#可行性分析)
5. [前置条件](#前置条件)
6. [技术架构设计](#技术架构设计)
7. [实施计划](#实施计划)

---

## 项目背景

### 现有AiNovel板块架构

当前AiNovel板块已包含以下核心模块：

- **世界观（WorldView）**: 世界观基础信息管理
- **地理（Geography）**: 星系、恒星、行星、卫星、地理单元管理
- **阵营（Faction）**: 阵营定义、阵营关系、阵营领土管理
- **角色（Role）**: 角色定义、角色信息、角色关系管理
- **时间线（Timeline）**: 时间线定义、时间线事件管理
- **故事线（StoryLine）**: 故事线管理
- **章节（Chapter）**: 章节内容管理
- **世界规则（WorldRule）**: 规则组、规则项、规则快照管理
- **魔法系统（MagicSystem）**: 魔法系统定义和版本管理

### 新增需求

需要添加两个新模块以增强世界观管理和创作辅助能力：

1. **世界态模块**: 存储和管理世界观的宏观状态，包括世界大事件、天灾、阵营间的协约与误判、人物间的协议与信息差（对"手牌"的认知差异）等
2. **脑洞模块**: 存储创作笔记，并使用LLM分析这些笔记对世界观和故事的影响

---

## 模块一：世界态模块

### 1.1 功能概述

世界态模块用于记录和追踪世界观在特定时间点的宏观状态，这些状态会影响后续的故事发展和角色行为。与时间线事件不同，世界态更关注**状态**而非**事件**，是持续存在的背景条件。

### 1.1.1 世界态运作逻辑

世界态之间存在复杂的**引用关系**，这种引用关系反映了世界观中不同状态之间的因果关系、影响关系和逻辑关联。理解这些引用关系对于正确建模世界观状态至关重要。

#### 引用关系规则

世界态之间的引用关系遵循以下规则：

1. **协约可以引用天灾**
   - **逻辑**: 天灾可能导致阵营间形成协约（如共同应对天灾的救援协议、资源分配协议）
   - **示例**: "北方联盟与南方联盟的粮食援助协约" 引用 "持续三年的干旱天灾"
   - **方向**: `faction_agreement` ← 引用 `natural_disaster`

2. **阵营误判可以引用阵营协约**
   - **逻辑**: 阵营协约可能被其他阵营误解，导致误判
   - **示例**: "A阵营误判B阵营与C阵营的贸易协定为军事同盟" 引用 "B阵营与C阵营的贸易协定"
   - **方向**: `faction_misunderstanding` ← 引用 `faction_agreement`

3. **人物认知差可以引用人物协议**
   - **逻辑**: 角色对对方协议/资源的认知可能不准确，形成信息差
   - **示例**: "角色A认为角色B只有1个秘密协议，但实际B有3个" 引用 "角色B与角色C的秘密协议"（作为实际存在的协议之一）
   - **方向**: `character_perception_gap` ← 引用 `character_agreement`（引用实际存在的协议，形成认知差）

4. **人物认知差可以引用阵营**
   - **逻辑**: 角色对阵营资源/能力/状态的认知可能不准确，形成信息差
   - **示例**: "角色A认为X阵营只有1000兵力，但实际有5000" 引用 "X阵营"（通过阵营ID关联）
   - **方向**: `character_perception_gap` ← 引用 `faction`（通过阵营ID关联）

5. **人物认知差可以引用世界态**
   - **逻辑**: 角色对世界态（如协约、天灾）的认知可能不准确，形成信息差
   - **示例**: "角色A认为某个协约已经失效，但实际仍然有效" 引用 "阵营协约"
   - **方向**: `character_perception_gap` ← 引用其他世界态（如 `faction_agreement`、`natural_disaster`等）

#### 完整的引用关系图

```
世界态引用关系（箭头表示"可以引用"的方向）：

世界大事件 (world_event)
  ↑
  │ (可能被其他世界态引用，但通常作为基础状态)
  │

天灾 (natural_disaster)
  ↑
  │ 被引用
  │
  └─── 阵营协约 (faction_agreement) ← 协约可以引用天灾
         ↑
         │ 被引用
         │
         └─── 阵营误判 (faction_misunderstanding) ← 阵营误判可以引用阵营协约

人物协议 (character_agreement)
  ↑
  │ 被引用
  │
人物认知差 (character_perception_gap) ← 可以引用人物协议（形成信息差）
  │
  │ 还可以引用
  │
  ├─── 阵营 (faction) ← 可以引用阵营（对阵营资源的认知差）
  │
  └─── 其他世界态 (world_state) ← 可以引用协约、天灾等（对世界态的认知差）
```

#### 引用关系的层次结构

世界态的引用关系呈现出**层次化**的特点：

1. **基础层（独立状态）**:
   - `world_event`（世界大事件）：通常作为独立的基础状态，较少被其他世界态引用
   - `natural_disaster`（天灾）：可能被协约引用

2. **协议层（基于基础状态）**:
   - `faction_agreement`（阵营协约）：可以引用天灾，形成应对性协约
   - `character_agreement`（人物协议）：通常独立存在，但可能被误判引用

3. **认知层（基于协议或实体）**:
   - `faction_misunderstanding`（阵营误判）：可以引用阵营协约，形成误解
   - `character_perception_gap`（人物认知差）：可以引用人物协议、阵营或其他世界态，形成信息差（对"手牌"的认知差异）

#### 引用关系的意义

1. **因果关系追踪**: 通过引用关系可以追踪世界态之间的因果关系链
   - 例如：天灾 → 协约 → 阵营误判 → 冲突升级
   - 例如：人物协议 → 人物认知差（对协议资源的认知差异）→ 错误决策

2. **影响传播分析**: 可以分析一个世界态如何通过引用关系影响其他世界态
   - 例如：天灾的影响如何通过协约传播到阵营关系

3. **一致性检查**: 可以检查引用关系是否合理，避免逻辑冲突
   - 例如：检查被引用的世界态是否存在、时间是否合理

4. **故事逻辑验证**: 可以验证故事逻辑的合理性
   - 例如：验证误判是否基于真实存在的协约或协议

#### 引用关系的实现

在数据库设计中，引用关系通过 `related_world_state_ids` 字段实现：

```sql
`related_world_state_ids` json COMMENT '关联世界态ID列表（引用关系）'
```

引用关系的特点：
- **有向性**: 引用关系是有方向的（A引用B，不等于B引用A）
- **多对多**: 一个世界态可以引用多个其他世界态
- **可追溯**: 可以通过引用关系追溯世界态的起源和影响链
- **可验证**: 系统可以验证引用关系的合理性（如时间顺序、类型匹配等）

#### 引用关系使用场景

1. **创建世界态时**: 用户可以选择引用其他已存在的世界态
2. **查看世界态时**: 显示该世界态引用了哪些其他世界态，以及被哪些世界态引用
3. **分析影响时**: 通过引用关系分析世界态的影响传播路径
4. **验证一致性时**: 检查引用关系是否合理，是否存在循环引用等
5. **可视化展示时**: 以图的形式展示世界态之间的引用关系网络

### 1.2 核心概念

#### 1.2.1 世界态类型

世界态按影响范围可分为以下类型：

- **世界大事件（World Events）**: 影响整个世界观的大规模事件状态
  - 示例：战争状态、经济危机、科技突破、文明衰落
  - 特点：影响范围广，持续时间长，影响多个阵营和角色

- **天灾（Natural Disasters）**: 自然灾害及其持续影响
  - 示例：持续干旱、地震余波、瘟疫蔓延、气候异常
  - 特点：地理相关，可能影响特定区域，持续时间不定

- **阵营协约（Faction Agreements）**: 阵营间的正式或非正式协议
  - 示例：贸易协定、军事同盟、停战协议、资源分配协议
  - 特点：涉及2个或多个阵营，有明确的生效和失效时间

- **阵营误判（Faction Misunderstandings）**: 阵营间的误解和错误认知
  - 示例：误以为对方有敌意、错误的情报认知、文化误解
  - 特点：可能影响阵营关系，可能被澄清或加深

- **人物协议（Character Agreements）**: 角色间的协议和约定
  - 示例：秘密联盟、交易约定、承诺、债务关系
  - 特点：涉及2个或多个角色，可能影响角色行为

- **人物认知差（Character Perception Gaps）**: 角色对对方"手牌"（资源、能力、状态、信息）的认知差异
  - **核心概念**: 信息差，即"我认为你手上有多少牌"的模式
  - **示例**: 
    - 角色A认为角色B有3个盟友，但实际B有5个（对资源的认知差）
    - 角色A认为角色B不知道某个秘密，但B实际知道（对信息的认知差）
    - 角色A认为角色B的军队只有1000人，但实际有5000人（对能力的认知差）
    - 角色A认为角色B处于困境，但B实际有后手（对状态的认知差）
  - **特点**: 
    - 关注信息不对称，而非关系本身（关系由角色关系模块管理）
    - 影响角色的决策和行为（基于错误认知做出错误决策）
    - 可能产生戏剧冲突和反转（认知差被揭示时的冲击）
  - **与角色关系的区别**: 
    - 角色关系模块：管理"A和B是什么关系"（朋友/敌人/盟友等）
    - 人物认知差：管理"A认为B有什么资源/能力/信息"（信息差）
  - **信息差的具体应用**:
    - **资源认知差**: A认为B有X资源，但实际B有Y资源（X≠Y）
    - **能力认知差**: A认为B的能力是X，但实际B的能力是Y
    - **状态认知差**: A认为B处于X状态，但实际B处于Y状态
    - **信息认知差**: A认为B知道/不知道X信息，但实际B知道/不知道Y信息
    - **协议认知差**: A认为B有X个协议/盟友，但实际B有Y个
    - **意图认知差**: A认为B的意图是X，但实际B的意图是Y（注意：这是对"手牌"的认知，不是对关系的认知）

#### 1.2.2 世界态属性

每个世界态记录应包含以下属性：

- **基础信息**
  - `id`: 唯一标识
  - `worldview_id`: 所属世界观ID（必填）
  - `state_type`: 世界态类型（必填）
  - `title`: 标题（必填）
  - `description`: 详细描述
  - `status`: 状态（active/expired/resolved/suspended）

- **时间信息**
  - `start_time`: 开始时间（时间线秒数）
  - `end_time`: 结束时间（时间线秒数，可为空表示持续）
  - `duration_days`: 持续时间（天，用于快速查询）

- **关联信息**
  - `related_faction_ids`: 关联阵营ID列表（JSON数组）
  - `related_role_ids`: 关联角色ID列表（JSON数组）
  - `related_geo_codes`: 关联地理编码列表（JSON数组）
  - `related_event_ids`: 关联时间线事件ID列表（JSON数组）
  - `related_chapter_ids`: 关联章节ID列表（JSON数组）

- **影响分析**
  - `impact_level`: 影响级别（low/medium/high/critical）
  - `impact_description`: 影响描述（LLM生成或手动填写）
  - `affected_areas`: 受影响领域（politics/economy/military/society/culture/other）

- **元数据**
  - `created_at`: 创建时间
  - `updated_at`: 更新时间
  - `created_by`: 创建者（可选）
  - `tags`: 标签（JSON数组，用于分类和搜索）

### 1.3 功能需求

#### 1.3.1 基础CRUD功能

- **创建世界态**: 支持创建各种类型的世界态记录
- **查询世界态**: 
  - 按世界观ID查询
  - 按类型筛选
  - 按状态筛选
  - 按时间范围筛选
  - 按关联的阵营/角色/地理筛选
  - 按影响级别筛选
- **更新世界态**: 支持更新世界态信息，记录变更历史
- **删除世界态**: 软删除或硬删除（建议软删除）

#### 1.3.2 时间线视图

- **时间轴展示**: 在世界观时间线上展示所有世界态
- **状态叠加**: 显示同一时间段内的多个世界态叠加效果
- **状态演变**: 展示世界态从开始到结束的演变过程

#### 1.3.3 关联关系管理

- **自动关联**: 根据描述内容自动识别并关联相关的阵营、角色、地理
- **手动关联**: 支持手动添加/移除关联关系
- **关联可视化**: 以图表形式展示世界态与各实体的关联关系
- **引用关系管理**: 
  - 支持创建世界态时引用其他世界态（遵循引用关系规则）
  - 支持查看引用关系链（追溯引用来源）
  - 支持查看被引用关系（查看哪些世界态引用了当前世界态）
  - 支持引用关系验证（检查引用关系是否符合规则、时间是否合理）
  - 支持引用关系可视化（以有向图形式展示引用网络）

#### 1.3.4 影响分析

- **影响评估**: 使用LLM分析世界态对世界观各要素的影响
- **影响传播**: 分析世界态影响的传播路径
  - 通过引用关系追踪影响传播链（如：天灾 → 协约 → 阵营误判 → 冲突升级）
  - 通过信息差追踪影响传播链（如：人物协议 → 人物认知差 → 错误决策 → 冲突）
  - 分析引用关系网络中的影响传播路径
  - 识别关键节点（被多个世界态引用的世界态）
- **引用关系影响分析**: 
  - 分析引用关系对世界态的影响（如：被引用的世界态如何影响引用它的世界态）
  - 分析引用链的累积影响（如：天灾的影响如何通过协约传播到阵营误判）
- **冲突检测**: 
  - 检测世界态之间的冲突（如：同时存在贸易协定和贸易战）
  - 检测引用关系中的逻辑冲突（如：引用了不存在的世界态、时间顺序不合理）
  - 检测循环引用（避免A引用B，B引用C，C引用A的情况）

#### 1.3.5 状态管理

- **状态转换**: 支持状态转换（active → expired/resolved）
- **状态提醒**: 当世界态即将到期或需要更新时提醒用户
- **状态历史**: 记录世界态的状态变更历史

#### 1.3.6 数据迁移功能（从章节内容提取）

- **功能概述**: 从已有章节内容中自动提取世界态信息，帮助用户快速建立世界态数据库
- **提取流程**:
  1. **章节范围选择**: 用户手动指定要分析的章节范围（可选择单个章节、章节范围或全部章节）
  2. **内容分析**: 使用DeepSeek模型分析章节内容，识别以下类型的世界态信息：
     - 世界大事件（如：战争爆发、经济危机、科技突破）
     - 天灾（如：持续干旱、地震、瘟疫）
     - 阵营协约（如：贸易协定、军事同盟、停战协议）
     - 阵营误判（如：误解对方意图、错误情报认知）
     - 人物协议（如：秘密联盟、交易约定、承诺）
     - 人物认知差（如：对对方资源/能力/信息的认知差异，如"认为对方只有1000兵力但实际有5000"）
  3. **结果展示**: 提取结果以列表形式展示，包含：
     - 提取到的世界态类型和标题
     - 相关描述和上下文
     - 关联的阵营、角色、地理等信息（如果能够识别）
     - 置信度评分（LLM识别的可信度）
  4. **选择性导入**: 用户审核提取结果，选择性导入到世界态数据库
     - 支持批量选择导入
     - 导入前可编辑和补充信息
     - 导入后自动建立关联关系
- **技术实现**:
  - 使用DeepSeek模型进行内容分析
  - 构建专门的提取提示词，指导模型识别世界态信息
  - 支持批量处理，但需要控制并发以避免API限流
  - 提供进度反馈和错误处理

### 1.4 数据库设计

```sql
-- 世界态主表
CREATE TABLE IF NOT EXISTS `world_state` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `worldview_id` bigint NOT NULL COMMENT '世界观ID',
  `state_type` varchar(50) NOT NULL COMMENT '世界态类型：world_event/natural_disaster/faction_agreement/faction_misunderstanding/character_agreement/character_perception_gap',
  `title` varchar(255) NOT NULL COMMENT '标题',
  `description` text COMMENT '详细描述',
  `status` varchar(20) DEFAULT 'active' COMMENT '状态：active/expired/resolved/suspended',
  `start_time` bigint COMMENT '开始时间（时间线秒数）',
  `end_time` bigint COMMENT '结束时间（时间线秒数，NULL表示持续）',
  `duration_days` int COMMENT '持续时间（天）',
  `related_faction_ids` json COMMENT '关联阵营ID列表',
  `related_role_ids` json COMMENT '关联角色ID列表',
  `related_geo_codes` json COMMENT '关联地理编码列表',
  `related_event_ids` json COMMENT '关联时间线事件ID列表',
  `related_chapter_ids` json COMMENT '关联章节ID列表',
  `related_world_state_ids` json COMMENT '关联世界态ID列表（引用关系，表示本世界态引用了哪些其他世界态）',
  `impact_level` varchar(20) DEFAULT 'medium' COMMENT '影响级别：low/medium/high/critical',
  `impact_description` text COMMENT '影响描述',
  `affected_areas` json COMMENT '受影响领域列表',
  `tags` json COMMENT '标签列表',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(100) COMMENT '创建者',
  PRIMARY KEY (`id`),
  KEY `idx_worldview_id` (`worldview_id`),
  KEY `idx_state_type` (`state_type`),
  KEY `idx_status` (`status`),
  KEY `idx_start_time` (`start_time`),
  KEY `idx_end_time` (`end_time`),
  KEY `idx_impact_level` (`impact_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='世界态主表';

-- 世界态状态历史表（可选，用于记录状态变更）
CREATE TABLE IF NOT EXISTS `world_state_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `world_state_id` bigint NOT NULL COMMENT '世界态ID',
  `old_status` varchar(20) COMMENT '旧状态',
  `new_status` varchar(20) NOT NULL COMMENT '新状态',
  `change_reason` text COMMENT '变更原因',
  `changed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `changed_by` varchar(100) COMMENT '变更者',
  PRIMARY KEY (`id`),
  KEY `idx_world_state_id` (`world_state_id`),
  KEY `idx_changed_at` (`changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='世界态状态历史表';
```

### 1.5 类型定义

```typescript
// src/types/IAiNoval.ts 新增

export type WorldStateType = 
  | 'world_event'           // 世界大事件
  | 'natural_disaster'       // 天灾
  | 'faction_agreement'      // 阵营协约
  | 'faction_misunderstanding' // 阵营误判
  | 'character_agreement'    // 人物协议
  | 'character_perception_gap'; // 人物认知差

export type WorldStateStatus = 
  | 'active'     // 活跃中
  | 'expired'    // 已过期
  | 'resolved'   // 已解决
  | 'suspended'; // 已暂停

export type ImpactLevel = 
  | 'low'      // 低影响
  | 'medium'   // 中等影响
  | 'high'     // 高影响
  | 'critical'; // 关键影响

export type AffectedArea = 
  | 'politics'  // 政治
  | 'economy'   // 经济
  | 'military'  // 军事
  | 'society'   // 社会
  | 'culture'   // 文化
  | 'other';    // 其他

export interface IWorldState {
  id?: number;
  worldview_id: number;
  state_type: WorldStateType;
  title: string;
  description?: string;
  status?: WorldStateStatus;
  start_time?: number;  // 时间线秒数
  end_time?: number;    // 时间线秒数，null表示持续
  duration_days?: number;
  related_faction_ids?: number[];
  related_role_ids?: number[];
  related_geo_codes?: string[];
  related_event_ids?: number[];
  related_chapter_ids?: number[];
  related_world_state_ids?: number[];  // 引用关系：本世界态引用了哪些其他世界态
  impact_level?: ImpactLevel;
  impact_description?: string;
  affected_areas?: AffectedArea[];
  tags?: string[];
  created_at?: Date;
  updated_at?: Date;
  created_by?: string;
}

export interface IWorldStateHistory {
  id?: number;
  world_state_id: number;
  old_status?: WorldStateStatus;
  new_status: WorldStateStatus;
  change_reason?: string;
  changed_at?: Date;
  changed_by?: string;
}
```

---

## 模块二：脑洞模块

### 2.1 功能概述

脑洞模块用于记录创作过程中的灵感、想法、笔记，并使用LLM分析这些笔记对世界观和故事的影响。这是一个**创作辅助工具**，帮助作者整理思路、发现潜在问题、挖掘创作机会。

### 2.2 核心概念

#### 2.2.1 脑洞类型

脑洞按内容性质可分为：

- **灵感（Inspiration）**: 突发奇想、创意点子
  - 示例：某个情节转折、角色设定、世界观细节
  - 特点：可能不完整，需要后续完善

- **问题（Problem）**: 发现的问题或矛盾
  - 示例：时间线冲突、角色行为不一致、世界观漏洞
  - 特点：需要解决或解释

- **想法（Idea）**: 初步的想法和方案
  - 示例：某个情节发展方案、角色关系设计
  - 特点：需要评估可行性

- **笔记（Note）**: 一般性笔记和记录
  - 示例：参考资料、观察记录、待办事项
  - 特点：信息性，可能不需要LLM分析

- **待验证（To Verify）**: 需要验证的想法
  - 示例：某个设定是否合理、某个情节是否符合世界观
  - 特点：需要LLM或人工验证

#### 2.2.2 脑洞属性

每个脑洞记录应包含以下属性：

- **基础信息**
  - `id`: 唯一标识
  - `worldview_id`: 所属世界观ID（必填）
  - `novel_id`: 所属小说ID（可选）
  - `brainstorm_type`: 脑洞类型（必填）
  - `title`: 标题（必填）
  - `content`: 内容（必填，支持Markdown）
  - `status`: 状态（draft/feasible_unused/in_use/used/suspended）

- **关联信息**
  - `related_faction_ids`: 关联阵营ID列表
  - `related_role_ids`: 关联角色ID列表
  - `related_geo_codes`: 关联地理编码列表
  - `related_event_ids`: 关联时间线事件ID列表
  - `related_chapter_ids`: 关联章节ID列表
  - `related_world_state_ids`: 关联世界态ID列表

- **LLM分析结果**
  - `analysis_status`: 分析状态（pending/analyzing/completed/failed）
  - `analysis_result`: LLM分析结果（JSON格式）
    - `impact_analysis`: 影响分析
    - `consistency_check`: 一致性检查
    - `suggestions`: 建议
    - `risks`: 风险提示
    - `opportunities`: 机会点
  - `analyzed_at`: 分析时间
  - `analysis_model`: 使用的LLM模型

- **优先级和分类**
  - `priority`: 优先级（low/medium/high/urgent）
  - `category`: 分类标签（plot/character/worldview/style/other）
  - `tags`: 标签列表

- **元数据**
  - `created_at`: 创建时间
  - `updated_at`: 更新时间
  - `created_by`: 创建者
  - `parent_id`: 父脑洞ID（用于脑洞关联和讨论）

### 2.3 功能需求

#### 2.3.1 基础CRUD功能

- **创建脑洞**: 支持创建各种类型的脑洞记录，支持Markdown格式
- **查询脑洞**: 
  - 按世界观ID查询
  - 按类型筛选
  - 按状态筛选
  - 按优先级筛选
  - 按分类筛选
  - 按标签搜索
  - 全文搜索（标题和内容）
- **更新脑洞**: 支持更新脑洞信息
- **删除脑洞**: 软删除或硬删除

#### 2.3.2 LLM分析功能

- **自动分析**: 创建或更新脑洞后，可选择自动触发LLM分析
- **手动分析**: 支持手动触发LLM分析
- **分析内容**:
  - **影响分析**: 分析脑洞对世界观各要素的影响
  - **一致性检查**: 检查脑洞与现有设定的冲突
  - **建议生成**: 生成改进建议和扩展方向
  - **风险提示**: 识别潜在的问题和风险
  - **机会挖掘**: 发现可以挖掘的创作机会

- **分析配置**: 
  - 统一使用DeepSeek模型（已确认）
  - 配置分析深度和详细程度
  - 指定分析重点（影响/一致性/建议等）

#### 2.3.3 关联管理

- **自动关联**: 使用LLM或关键词匹配自动识别关联的实体
- **手动关联**: 支持手动添加/移除关联关系
- **关联可视化**: 以图表形式展示脑洞与各实体的关联关系

#### 2.3.4 脑洞管理

- **脑洞分类**: 支持按分类和标签组织脑洞
- **脑洞关联**: 支持脑洞之间的关联（父子关系、相关关系）
- **脑洞状态**: 支持状态流转（草稿 → 可行未使用 → 使用中 → 已使用，或暂时搁置）
- **批量操作**: 支持批量更新状态、标签、分类等

#### 2.3.5 搜索和过滤

- **全文搜索**: 支持对标题和内容进行全文搜索
- **高级过滤**: 支持多条件组合过滤
- **智能推荐**: 基于当前编辑内容推荐相关脑洞

### 2.4 数据库设计

```sql
-- 脑洞主表
CREATE TABLE IF NOT EXISTS `brainstorm` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `worldview_id` bigint NOT NULL COMMENT '世界观ID',
  `novel_id` bigint COMMENT '小说ID（可选）',
  `brainstorm_type` varchar(50) NOT NULL COMMENT '脑洞类型：inspiration/problem/idea/note/to_verify',
  `title` varchar(255) NOT NULL COMMENT '标题',
  `content` text NOT NULL COMMENT '内容（支持Markdown）',
  `status` varchar(20) DEFAULT 'draft' COMMENT '状态：draft/feasible_unused/in_use/used/suspended',
  `priority` varchar(20) DEFAULT 'medium' COMMENT '优先级：low/medium/high/urgent',
  `category` varchar(50) COMMENT '分类：plot/character/worldview/style/other',
  `tags` json COMMENT '标签列表',
  `related_faction_ids` json COMMENT '关联阵营ID列表',
  `related_role_ids` json COMMENT '关联角色ID列表',
  `related_geo_codes` json COMMENT '关联地理编码列表',
  `related_event_ids` json COMMENT '关联时间线事件ID列表',
  `related_chapter_ids` json COMMENT '关联章节ID列表',
  `related_world_state_ids` json COMMENT '关联世界态ID列表',
  `parent_id` bigint COMMENT '父脑洞ID',
  `analysis_status` varchar(20) DEFAULT 'pending' COMMENT '分析状态：pending/analyzing/completed/failed',
  `analysis_result` json COMMENT 'LLM分析结果',
  `analyzed_at` timestamp COMMENT '分析时间',
  `analysis_model` varchar(100) COMMENT '使用的LLM模型',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(100) COMMENT '创建者',
  PRIMARY KEY (`id`),
  KEY `idx_worldview_id` (`worldview_id`),
  KEY `idx_novel_id` (`novel_id`),
  KEY `idx_brainstorm_type` (`brainstorm_type`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_category` (`category`),
  KEY `idx_analysis_status` (`analysis_status`),
  KEY `idx_parent_id` (`parent_id`),
  FULLTEXT KEY `idx_fulltext` (`title`, `content`) WITH PARSER ngram
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='脑洞主表';

-- 脑洞分析历史表（可选，用于记录多次分析结果）
CREATE TABLE IF NOT EXISTS `brainstorm_analysis_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `brainstorm_id` bigint NOT NULL COMMENT '脑洞ID',
  `analysis_result` json NOT NULL COMMENT '分析结果',
  `analysis_model` varchar(100) COMMENT '使用的LLM模型',
  `analyzed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_brainstorm_id` (`brainstorm_id`),
  KEY `idx_analyzed_at` (`analyzed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='脑洞分析历史表';
```

### 2.5 类型定义

```typescript
// src/types/IAiNoval.ts 新增

export type BrainstormType = 
  | 'inspiration'  // 灵感
  | 'problem'      // 问题
  | 'idea'         // 想法
  | 'note'         // 笔记
  | 'to_verify';   // 待验证

export type BrainstormStatus = 
  | 'draft'            // 草稿
  | 'feasible_unused'  // 可行未使用
  | 'in_use'           // 使用中
  | 'used'             // 已使用
  | 'suspended';       // 暂时搁置

export type AnalysisStatus = 
  | 'pending'    // 待分析
  | 'analyzing'  // 分析中
  | 'completed'  // 已完成
  | 'failed';    // 分析失败

export type Priority = 
  | 'low'     // 低
  | 'medium'  // 中
  | 'high'    // 高
  | 'urgent'; // 紧急

export type BrainstormCategory = 
  | 'plot'      // 情节
  | 'character' // 角色
  | 'worldview' // 世界观
  | 'style'     // 风格
  | 'other';    // 其他

export interface IBrainstormAnalysisResult {
  impact_analysis?: {
    description: string;
    affected_entities?: {
      factions?: number[];
      roles?: number[];
      geos?: string[];
      events?: number[];
      chapters?: number[];
    };
  };
  consistency_check?: {
    conflicts?: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    consistency_score?: number; // 0-100
  };
  suggestions?: Array<{
    type: string;
    content: string;
    priority: Priority;
  }>;
  risks?: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  opportunities?: Array<{
    type: string;
    description: string;
    potential: 'low' | 'medium' | 'high';
  }>;
}

export interface IBrainstorm {
  id?: number;
  worldview_id: number;
  novel_id?: number;
  brainstorm_type: BrainstormType;
  title: string;
  content: string;  // Markdown格式
  status?: BrainstormStatus;
  priority?: Priority;
  category?: BrainstormCategory;
  tags?: string[];
  related_faction_ids?: number[];
  related_role_ids?: number[];
  related_geo_codes?: string[];
  related_event_ids?: number[];
  related_chapter_ids?: number[];
  related_world_state_ids?: number[];
  parent_id?: number;
  analysis_status?: AnalysisStatus;
  analysis_result?: IBrainstormAnalysisResult;
  analyzed_at?: Date;
  analysis_model?: string;
  created_at?: Date;
  updated_at?: Date;
  created_by?: string;
}

export interface IBrainstormAnalysisHistory {
  id?: number;
  brainstorm_id: number;
  analysis_result: IBrainstormAnalysisResult;
  analysis_model?: string;
  analyzed_at?: Date;
}
```

---

## 可行性分析

### 3.1 技术可行性

#### ✅ 高度可行

1. **数据库设计**: 
   - 现有MySQL数据库架构支持新增表结构
   - JSON字段支持灵活的关联关系存储
   - 全文索引支持搜索功能

2. **后端API**: 
   - 现有API架构（Next.js API Routes）可直接复用
   - 现有Service层模式（MysqlNovalService）可直接扩展
   - 现有工具配置系统可支持LLM配置

3. **前端组件**: 
   - 现有Ant Design组件库可满足UI需求
   - 现有Context模式可支持状态管理
   - 现有业务组件结构可复用

4. **LLM集成**: 
   - 现有ReAct Agent框架可支持复杂分析
   - 现有Dify API集成可支持工作流
   - 现有模型工厂（DeepSeek）可直接使用（统一使用DeepSeek模型）

### 3.2 业务可行性

#### ✅ 高度可行

1. **需求明确**: 两个模块的功能需求清晰，与现有模块边界明确
2. **价值明确**: 能够显著提升世界观管理和创作辅助能力
3. **用户价值**: 解决实际创作中的痛点（状态管理、灵感整理）

### 3.3 实施可行性

#### ✅ 高度可行

1. **模块化设计**: 两个模块相对独立，可分别实施
2. **渐进式开发**: 可先实现基础CRUD，再逐步添加高级功能
3. **复用现有代码**: 大量代码可复用现有模块的实现

### 3.4 潜在风险

#### ⚠️ 需要注意的风险

1. **LLM分析质量**: 
   - 风险：LLM分析结果可能不够准确或有用
   - 缓解：提供人工审核和编辑功能，支持多次分析

2. **性能问题**: 
   - 风险：大量关联查询可能影响性能
   - 缓解：合理使用索引，考虑缓存策略

3. **数据一致性**: 
   - 风险：关联的实体被删除时可能出现数据不一致
   - 缓解：使用软删除，或提供数据清理机制

---

## 前置条件

### 4.1 技术前置条件

#### ✅ 已满足

1. **数据库**: MySQL数据库已配置并运行
2. **后端框架**: Next.js API Routes已配置
3. **前端框架**: React + TypeScript + Ant Design已配置
4. **LLM集成**: ReAct Agent和Dify API已集成
5. **工具系统**: MCP工具注册表已配置

### 4.2 业务前置条件

#### ✅ 已满足

1. **世界观管理**: 世界观（WorldView）模块已实现
2. **实体管理**: 阵营、角色、地理、事件等实体管理已实现
3. **时间线系统**: 时间线定义和事件管理已实现

### 4.3 已确认事项

#### ✅ 已确认

1. **LLM模型选择**: 
   - ✅ **统一使用DeepSeek模型**：所有LLM分析功能（世界态影响分析、脑洞分析）统一使用DeepSeek模型
   - 分析提示词的设计方案：参考现有ReAct Agent和Dify工作流的提示词设计模式

2. **权限控制**: 
   - ⚠️ 待确认：是否需要权限控制（创建/编辑/删除权限）
   - ⚠️ 待确认：是否需要审核流程

3. **数据迁移**: 
   - ✅ **从章节内容提取世界态信息**：
     - 数据来源：章节（Chapter）表的内容字段
     - 提取范围：手动指定章节范围（可选择特定章节或章节范围）
     - 提取方式：使用DeepSeek LLM分析章节内容，识别世界态相关信息
     - 输出方式：**结论暂定为展示**（提取结果以列表形式展示，用户可选择性导入）
     - 提取内容：世界大事件、天灾、阵营协约、阵营误判、人物协议、人物认知差等
   - ⚠️ 待确认：是否需要导入历史脑洞数据

---

## 技术架构设计

### 5.1 目录结构

```
pages/api/web/aiNoval/
├── worldState/              # 世界态API
│   ├── index.ts            # CRUD操作
│   ├── list.ts             # 列表查询
│   ├── analyze.ts          # 影响分析（DeepSeek）
│   ├── timeline.ts          # 时间线视图
│   └── extractFromChapters.ts  # 从章节提取世界态（DeepSeek）
│
└── brainstorm/              # 脑洞API
    ├── index.ts            # CRUD操作
    ├── list.ts             # 列表查询
    ├── analyze.ts          # LLM分析（DeepSeek）
    └── search.ts           # 全文搜索

src/services/aiNoval/
├── worldStateService.js    # 世界态Service
└── brainstormService.js    # 脑洞Service

src/business/aiNoval/
├── worldStateManage/        # 世界态管理页面
│   ├── index.tsx
│   ├── components/
│   │   ├── WorldStateList.tsx
│   │   ├── WorldStateEditModal.tsx
│   │   ├── WorldStateTimelineView.tsx
│   │   └── WorldStateImpactAnalysis.tsx
│   └── worldStateManageContext.tsx
│
└── brainstormManage/        # 脑洞管理页面
    ├── index.tsx
    ├── components/
    │   ├── BrainstormList.tsx
    │   ├── BrainstormEditModal.tsx
    │   ├── BrainstormAnalysisPanel.tsx
    │   └── BrainstormSearch.tsx
    └── brainstormManageContext.tsx
```

### 5.2 API设计

#### 5.2.1 世界态API

```
GET    /api/web/aiNoval/worldState/list          # 查询世界态列表
GET    /api/web/aiNoval/worldState               # 查询单个世界态
POST   /api/web/aiNoval/worldState               # 创建世界态
POST   /api/web/aiNoval/worldState?id=xxx        # 更新世界态
DELETE /api/web/aiNoval/worldState?id=xxx        # 删除世界态
POST   /api/web/aiNoval/worldState/analyze       # 分析世界态影响（使用DeepSeek）
GET    /api/web/aiNoval/worldState/timeline      # 获取时间线视图
GET    /api/web/aiNoval/worldState/references?id=xxx  # 获取引用关系（引用了哪些、被哪些引用）
POST   /api/web/aiNoval/worldState/validateReferences  # 验证引用关系的合理性
GET    /api/web/aiNoval/worldState/referenceGraph      # 获取引用关系图（用于可视化）
```

#### 5.2.2 脑洞API

```
GET    /api/web/aiNoval/brainstorm/list          # 查询脑洞列表
GET    /api/web/aiNoval/brainstorm               # 查询单个脑洞
POST   /api/web/aiNoval/brainstorm               # 创建脑洞
POST   /api/web/aiNoval/brainstorm?id=xxx        # 更新脑洞
DELETE /api/web/aiNoval/brainstorm?id=xxx        # 删除脑洞
POST   /api/web/aiNoval/brainstorm/analyze       # LLM分析脑洞（使用DeepSeek）
GET    /api/web/aiNoval/brainstorm/search        # 全文搜索
```

#### 5.2.3 数据迁移API

```
POST   /api/web/aiNoval/worldState/extractFromChapters  # 从章节内容提取世界态信息
  # 请求体：{ chapter_ids: number[], worldview_id: number }
  # 返回：提取结果列表（展示用，用户选择性导入）
  # 使用DeepSeek模型分析章节内容，识别世界态相关信息
```

### 5.3 LLM分析流程

#### 5.3.1 世界态影响分析流程

```
1. 用户触发分析
2. 收集世界态信息及相关实体信息
3. 构建分析提示词
4. 调用DeepSeek模型（通过ReAct Agent或直接调用）
5. 解析分析结果
6. 保存分析结果到数据库
7. 返回分析结果给前端
```

#### 5.3.3 数据迁移流程（从章节提取世界态）

```
1. 用户选择章节范围（手动指定章节ID列表）
2. 获取选定章节的内容
3. 构建提取提示词（指导DeepSeek识别世界态信息）
4. 调用DeepSeek模型分析章节内容
5. 解析提取结果（识别世界大事件、天灾、阵营协约等）
6. 返回提取结果列表（展示用）
7. 用户选择性导入到世界态数据库
```

#### 5.3.2 脑洞分析流程

```
1. 用户触发分析（自动或手动）
2. 收集脑洞内容及相关实体信息
3. 构建分析提示词（包括影响分析、一致性检查、建议生成等）
4. 调用DeepSeek模型（统一使用DeepSeek）
5. 解析分析结果（JSON格式）
6. 保存分析结果到数据库
7. 更新分析状态
8. 返回分析结果给前端
```

### 5.4 前端组件设计

#### 5.4.1 世界态管理页面UI结构草案

##### 一、交互分块规划

世界态管理页面采用**多视图切换 + 详情面板**的布局模式，将功能划分为以下交互块：

**1. 顶部工具栏块（Toolbar Block）**
- **位置**: 页面顶部，固定高度
- **功能**: 
  - 世界观选择器（下拉选择）
  - 视图切换（列表视图/时间线视图/关系图视图）
  - 全局操作按钮（创建世界态、数据迁移、批量操作）
  - 全局搜索框
- **特点**: 始终可见，提供全局导航和操作入口

**2. 左侧筛选器块（Filter Block）**
- **位置**: 页面左侧，可折叠
- **功能**:
  - 世界态类型筛选（多选）
  - 状态筛选（active/expired/resolved/suspended）
  - 影响级别筛选（low/medium/high/critical）
  - 时间范围筛选（开始时间、结束时间）
  - 关联实体筛选（阵营、角色、地理）
  - 标签筛选
- **特点**: 支持多条件组合筛选，筛选结果实时更新主视图

**3. 主视图块（Main View Block）**
- **位置**: 页面中央，占据主要空间
- **功能**: 根据视图模式切换显示不同内容
  - **列表视图模式**: 表格展示世界态，支持排序、分页
  - **时间线视图模式**: 时间轴展示世界态，支持缩放、拖拽
  - **关系图视图模式**: 可视化展示世界态之间的引用关系网络
- **特点**: 支持视图切换，不同视图提供不同的交互方式

**4. 右侧详情面板块（Detail Panel Block）**
- **位置**: 页面右侧，可折叠/展开
- **功能**: 显示选中世界态的详细信息
  - 基础信息展示
  - 关联关系展示（阵营、角色、地理、事件、章节）
  - 引用关系展示（引用了哪些、被哪些引用）
  - 影响分析结果展示（LLM分析）
  - 状态历史展示
- **特点**: 点击列表项时展开，支持快速编辑和操作

**5. 编辑模态框块（Edit Modal Block）**
- **位置**: 浮层，覆盖整个页面
- **功能**: 创建/编辑世界态的表单
  - 基础信息编辑（标题、类型、描述、状态、时间）
  - 关联关系编辑（选择阵营、角色、地理等）
  - 引用关系编辑（选择引用的世界态，遵循引用规则）
  - 标签管理
- **特点**: 模态框形式，支持分步骤编辑（基础信息 → 关联关系 → 引用关系）

**6. 数据迁移面板块（Migration Panel Block）**
- **位置**: 浮层或侧边抽屉
- **功能**: 从章节内容提取世界态信息
  - 章节范围选择器
  - 提取进度显示
  - 提取结果列表（可筛选、排序）
  - 批量导入操作
- **特点**: 独立面板，支持异步操作和进度反馈

**7. 关系可视化块（Relation Visualization Block）**
- **位置**: 可切换为全屏视图
- **功能**: 可视化展示世界态之间的关系
  - 引用关系图（有向图）
  - 关联关系图（网络图）
  - 影响传播路径图
- **特点**: 支持交互式探索（点击节点、拖拽、缩放、筛选）

##### 二、块内交互的方法论

**1. 顶部工具栏块的交互方法论**

- **世界观选择器**:
  - 交互方式: 下拉选择，支持搜索
  - 状态管理: 选择后更新全局状态，触发数据重新加载
  - 反馈机制: 加载状态提示，选择后显示当前世界观名称

- **视图切换**:
  - 交互方式: Tab切换或按钮组
  - 状态管理: 记录当前视图模式，切换时保持筛选条件
  - 反馈机制: 高亮当前视图，切换时显示过渡动画

- **全局操作按钮**:
  - 交互方式: 按钮点击，触发模态框或面板
  - 状态管理: 按钮状态（禁用/启用）根据当前上下文决定
  - 反馈机制: 点击后打开对应面板，显示操作反馈

- **全局搜索**:
  - 交互方式: 输入框实时搜索
  - 状态管理: 搜索关键词，搜索结果高亮
  - 反馈机制: 实时显示搜索结果数量，支持清空和快捷键

**2. 左侧筛选器块的交互方法论**

- **筛选器组织**:
  - 交互方式: 折叠面板（Collapse），每个筛选器独立折叠
  - 状态管理: 筛选条件对象，支持重置和保存筛选预设
  - 反馈机制: 显示当前筛选条件数量，筛选结果实时更新

- **多选筛选**:
  - 交互方式: Checkbox组或Tag选择器
  - 状态管理: 选中的值数组，支持全选/反选
  - 反馈机制: 显示选中数量，支持快速清除

- **时间范围筛选**:
  - 交互方式: DatePicker范围选择器
  - 状态管理: 开始时间和结束时间
  - 反馈机制: 显示选择的时间范围，支持快捷选择（今天/本周/本月）

- **关联实体筛选**:
  - 交互方式: 下拉多选（支持搜索）
  - 状态管理: 选中的实体ID数组
  - 反馈机制: 显示选中实体名称，支持快速清除

**3. 主视图块的交互方法论**

- **列表视图模式**:
  - **表格交互**:
    - 排序: 点击列头排序，支持多列排序
    - 分页: 底部分页器，支持跳转和每页数量设置
    - 行选择: 复选框选择，支持全选
    - 行操作: 悬停显示操作按钮（编辑/删除/查看详情）
  - **状态管理**: 当前页码、排序字段、选中行
  - **反馈机制**: 加载状态、空状态提示、操作成功提示

- **时间线视图模式**:
  - **时间轴交互**:
    - 缩放: 鼠标滚轮或滑块缩放时间范围
    - 拖拽: 拖拽时间轴移动视图
    - 点击: 点击世界态节点查看详情
    - 筛选: 根据类型/状态高亮显示
  - **状态管理**: 当前时间范围、缩放级别、选中节点
  - **反馈机制**: 时间范围显示、节点悬停提示、加载状态

- **关系图视图模式**:
  - **图形交互**:
    - 节点点击: 选中节点，显示详情
    - 节点拖拽: 调整节点位置
    - 连线点击: 高亮引用关系
    - 缩放平移: 鼠标滚轮缩放，拖拽平移
    - 筛选: 根据类型/状态筛选节点
  - **状态管理**: 图形布局、选中节点、筛选条件
  - **反馈机制**: 节点悬停提示、连线高亮、加载状态

**4. 右侧详情面板块的交互方法论**

- **面板展开/折叠**:
  - 交互方式: 点击展开按钮或点击列表项自动展开
  - 状态管理: 面板展开状态、当前选中世界态ID
  - 反馈机制: 展开动画、折叠时保存滚动位置

- **信息展示组织**:
  - 交互方式: Tab切换或折叠面板组织不同信息
  - Tab组织: 基础信息 / 关联关系 / 引用关系 / 影响分析 / 状态历史
  - 状态管理: 当前激活的Tab
  - 反馈机制: Tab切换动画、内容加载状态

- **关联关系展示**:
  - 交互方式: 列表展示，支持点击跳转
  - 状态管理: 关联实体列表
  - 反馈机制: 悬停高亮、点击跳转到对应管理页面

- **引用关系展示**:
  - 交互方式: 树形结构或列表展示
  - 状态管理: 引用关系树
  - 反馈机制: 展开/折叠节点、点击跳转到被引用世界态

- **快速操作**:
  - 交互方式: 操作按钮（编辑/删除/复制/分析）
  - 状态管理: 操作状态
  - 反馈机制: 按钮加载状态、操作成功提示

**5. 编辑模态框块的交互方法论**

- **模态框打开/关闭**:
  - 交互方式: 点击创建/编辑按钮打开，点击取消/确定关闭
  - 状态管理: 模态框显示状态、编辑模式（创建/编辑）
  - 反馈机制: 打开动画、关闭前确认（如有未保存更改）

- **表单组织**:
  - 交互方式: 分步骤表单（Steps）或单页表单
  - 步骤划分:
    1. 基础信息（标题、类型、描述、状态、时间）
    2. 关联关系（选择阵营、角色、地理、事件、章节）
    3. 引用关系（选择引用的世界态，遵循引用规则）
    4. 标签和元数据
  - 状态管理: 当前步骤、表单数据、验证状态
  - 反馈机制: 步骤进度显示、字段验证提示、保存状态

- **引用关系选择器**:
  - 交互方式: 下拉选择器（支持搜索和多选）
  - 规则验证: 根据当前世界态类型，过滤可引用的世界态类型
  - 状态管理: 选中的引用世界态ID数组
  - 反馈机制: 显示引用规则提示、验证错误提示

- **表单验证**:
  - 交互方式: 实时验证和提交时验证
  - 验证规则: 必填字段、类型匹配、引用关系规则、时间逻辑
  - 状态管理: 验证错误信息
  - 反馈机制: 字段错误提示、提交按钮禁用状态

**6. 数据迁移面板块的交互方法论**

- **面板打开/关闭**:
  - 交互方式: 点击数据迁移按钮打开侧边抽屉或模态框
  - 状态管理: 面板显示状态
  - 反馈机制: 打开动画

- **章节范围选择**:
  - 交互方式: 树形选择器或列表选择器（支持搜索）
  - 状态管理: 选中的章节ID数组
  - 反馈机制: 显示选中章节数量、章节信息预览

- **提取操作**:
  - 交互方式: 点击提取按钮触发异步操作
  - 状态管理: 提取状态（idle/running/completed/failed）、进度百分比
  - 反馈机制: 进度条、状态提示、取消按钮

- **结果展示和筛选**:
  - 交互方式: 列表展示提取结果，支持筛选和排序
  - 状态管理: 提取结果列表、筛选条件
  - 反馈机制: 结果数量显示、置信度评分显示、高亮匹配项

- **批量导入**:
  - 交互方式: 复选框选择 + 批量导入按钮
  - 状态管理: 选中的结果、导入状态
  - 反馈机制: 选中数量显示、导入进度、成功/失败提示

**7. 关系可视化块的交互方法论**

- **视图切换**:
  - 交互方式: Tab切换不同关系视图
  - 视图类型: 引用关系图 / 关联关系图 / 影响传播路径图
  - 状态管理: 当前视图类型、图形数据
  - 反馈机制: Tab切换动画、图形加载状态

- **图形交互**:
  - 节点交互:
    - 点击: 选中节点，显示详情
    - 双击: 跳转到对应世界态详情
    - 悬停: 显示节点信息提示
    - 拖拽: 调整节点位置（仅关联关系图）
  - 连线交互:
    - 点击: 高亮引用关系
    - 悬停: 显示关系信息
  - 画布交互:
    - 缩放: 鼠标滚轮或按钮缩放
    - 平移: 拖拽画布移动视图
    - 重置: 重置视图到初始状态
  - 状态管理: 节点位置、选中节点、缩放级别、平移偏移
  - 反馈机制: 节点高亮、连线高亮、工具提示、加载状态

- **筛选和搜索**:
  - 交互方式: 侧边筛选面板 + 搜索框
  - 筛选条件: 世界态类型、状态、时间范围
  - 状态管理: 筛选条件、搜索结果
  - 反馈机制: 高亮匹配节点、显示匹配数量

##### 三、整体布局结构

```
┌─────────────────────────────────────────────────────────────┐
│  顶部工具栏块                                                │
│  [世界观选择] [列表|时间线|关系图] [创建] [数据迁移] [搜索] │
├──────────┬──────────────────────────────────────┬───────────┤
│          │                                      │           │
│  左侧    │          主视图块                    │  右侧     │
│  筛选器  │    (列表/时间线/关系图)              │  详情面板  │
│  块      │                                      │  块       │
│          │                                      │           │
│  [类型]  │                                      │  [基础]   │
│  [状态]  │                                      │  [关联]   │
│  [时间]  │                                      │  [引用]   │
│  [实体]  │                                      │  [分析]   │
│          │                                      │           │
└──────────┴──────────────────────────────────────┴───────────┘
```

**响应式布局**:
- 桌面端（>1200px）: 三栏布局（筛选器 | 主视图 | 详情面板）
- 平板端（768px-1200px）: 两栏布局（筛选器可折叠，主视图 | 详情面板）
- 移动端（<768px）: 单栏布局（筛选器和详情面板均为抽屉形式）

**状态管理策略**:
- 使用Context管理全局状态（世界观ID、当前视图、选中世界态）
- 使用本地状态管理UI状态（面板展开/折叠、模态框显示）
- 使用URL参数管理筛选条件和视图状态（支持分享和书签）

#### 5.4.2 脑洞管理页面

- **主列表视图**: 卡片或表格展示脑洞，支持筛选和搜索
- **编辑模态框**: 支持Markdown编辑的脑洞编辑器
- **分析结果面板**: 展示LLM分析结果，支持展开/折叠
- **关联脑洞视图**: 展示脑洞之间的关联关系
- **搜索面板**: 高级搜索和过滤功能

---

## 实施计划

### 6.1 阶段一：基础功能（预计5-7天）

#### 6.1.1 世界态模块基础功能

- [ ] 数据库表创建
- [ ] TypeScript类型定义
- [ ] Service层实现
- [ ] API接口实现（CRUD）
- [ ] 前端列表和编辑组件
- [ ] 基础测试

#### 6.1.2 脑洞模块基础功能

- [ ] 数据库表创建
- [ ] TypeScript类型定义
- [ ] Service层实现
- [ ] API接口实现（CRUD）
- [ ] 前端列表和编辑组件（支持Markdown）
- [ ] 基础测试

**工作量**: 5-7天  
**优先级**: P0（最高）

### 6.2 阶段二：关联和查询功能（预计4-5天）

- [ ] 世界态关联管理功能
- [ ] **世界态引用关系管理功能**（新增）
  - [ ] 引用关系数据库字段和类型定义
  - [ ] 引用关系CRUD功能
  - [ ] 引用关系规则验证（检查引用关系是否符合规则）
  - [ ] 引用关系查询API（查询引用了哪些、被哪些引用）
- [ ] 脑洞关联管理功能
- [ ] 高级查询和过滤功能
- [ ] 全文搜索功能（脑洞）
- [ ] 关联关系可视化
- [ ] **引用关系可视化**（新增）
  - [ ] 引用关系图组件（有向图）
  - [ ] 引用链展示组件

**工作量**: 4-5天  
**优先级**: P1（高）

### 6.3 阶段三：LLM分析功能（预计4-5天）

- [ ] 世界态影响分析LLM集成（使用DeepSeek）
- [ ] **引用关系影响传播分析**（新增）
  - [ ] 通过引用关系追踪影响传播链
  - [ ] 分析引用链的累积影响
- [ ] 脑洞分析LLM集成（使用DeepSeek）
- [ ] 分析结果展示组件
- [ ] 分析配置（深度、重点等，模型已固定为DeepSeek）
- [ ] 分析历史记录

**工作量**: 4-5天  
**优先级**: P1（高）

### 6.4 阶段四：高级功能（预计4-5天）

- [ ] 世界态时间线视图
- [ ] 世界态状态管理
- [ ] **引用关系冲突检测**（新增）
  - [ ] 检测循环引用
  - [ ] 检测时间顺序不合理
  - [ ] 检测引用不存在的世界态
- [ ] 脑洞状态流转
- [ ] 批量操作功能
- [ ] 数据导入/导出
- [ ] **数据迁移功能**：从章节内容提取世界态信息
  - [ ] 章节范围选择界面（手动指定章节范围）
  - [ ] DeepSeek LLM提取世界态信息
  - [ ] 提取结果展示界面（结论展示，用户选择性导入）
  - [ ] **提取时识别引用关系**（新增）

**工作量**: 4-5天  
**优先级**: P2（中）

### 6.5 阶段五：优化和测试（预计2-3天）

- [ ] 性能优化
- [ ] UI/UX优化
- [ ] 单元测试
- [ ] 集成测试
- [ ] 文档编写

**工作量**: 2-3天  
**优先级**: P2（中）

### 6.6 总计

- **总工作量**: 19-26天（因新增引用关系功能，工作量增加2-3天）
- **建议优先级**: 先完成阶段一和阶段二，再根据用户反馈决定后续功能
- **引用关系功能**: 引用关系是核心功能，建议在阶段二重点实现

---

## 附录

### A. 相关文件清单

#### 需要创建的文件

**数据库**:
- `src/services/aiNoval/worldState.sql`
- `src/services/aiNoval/brainstorm.sql`

**后端**:
- `pages/api/web/aiNoval/worldState/index.ts`
- `pages/api/web/aiNoval/worldState/list.ts`
- `pages/api/web/aiNoval/worldState/analyze.ts` (使用DeepSeek)
- `pages/api/web/aiNoval/worldState/timeline.ts`
- `pages/api/web/aiNoval/worldState/references.ts` (引用关系查询)
- `pages/api/web/aiNoval/worldState/validateReferences.ts` (引用关系验证)
- `pages/api/web/aiNoval/worldState/referenceGraph.ts` (引用关系图)
- `pages/api/web/aiNoval/worldState/extractFromChapters.ts` (使用DeepSeek)
- `pages/api/web/aiNoval/brainstorm/index.ts`
- `pages/api/web/aiNoval/brainstorm/list.ts`
- `pages/api/web/aiNoval/brainstorm/analyze.ts` (使用DeepSeek)
- `pages/api/web/aiNoval/brainstorm/search.ts`
- `src/services/aiNoval/worldStateService.js`
- `src/services/aiNoval/brainstormService.js`

**前端**:
- `src/types/IAiNoval.ts` (修改，添加新类型)
- `src/api/aiNovel.ts` (修改，添加API调用)
- `src/business/aiNoval/worldStateManage/index.tsx`
- `src/business/aiNoval/worldStateManage/components/` (多个组件)
  - `WorldStateExtractPanel.tsx` (数据迁移面板)
  - `WorldStateReferenceView.tsx` (引用关系视图)
  - `WorldStateReferenceGraph.tsx` (引用关系图可视化)
  - `WorldStateReferenceSelector.tsx` (引用关系选择器)
- `src/business/aiNoval/worldStateManage/worldStateManageContext.tsx`
- `src/business/aiNoval/brainstormManage/index.tsx`
- `src/business/aiNoval/brainstormManage/components/` (多个组件)
- `src/business/aiNoval/brainstormManage/brainstormManageContext.tsx`

**路由**:
- `src/router/index.tsx` (修改，添加新路由)

### B. 参考实现

可以参考以下现有模块的实现：

- **世界规则模块**: `pages/api/web/aiNoval/worldrule/` - 参考CRUD实现
- **阵营管理模块**: `src/business/aiNoval/factionManage/` - 参考关联管理
- **时间线管理模块**: `src/business/aiNoval/timelineManage/` - 参考时间线视图
- **章节管理模块**: `src/business/aiNoval/chapterManage/` - 参考LLM集成

### C. 注意事项

1. **数据一致性**: 删除关联实体时，需要处理世界态和脑洞中的关联关系
   - **引用关系一致性**: 删除被引用的世界态时，需要处理引用它的世界态（警告、移除引用或阻止删除）
2. **性能优化**: 大量关联查询时，考虑使用缓存或优化查询
   - **引用关系查询**: 引用关系可能形成复杂的网络，需要优化查询性能
   - **引用关系图**: 大量世界态时，引用关系图可能很复杂，需要支持缩放和过滤
3. **LLM成本**: LLM分析会产生API调用成本，需要合理控制调用频率
   - 统一使用DeepSeek模型，成本相对可控
   - 数据迁移功能需要批量处理章节，注意控制并发和频率
4. **用户体验**: LLM分析可能需要较长时间，需要提供加载状态和进度提示
5. **数据迁移注意事项**:
   - 章节内容提取需要用户手动指定范围，避免全量处理
   - 提取结果以展示为主，用户选择性导入，避免自动导入错误数据
   - 提取过程可能需要较长时间，需要提供进度反馈
   - 提取结果需要人工审核，确保准确性
   - **提取时识别引用关系**: 提取世界态时，需要识别并建立引用关系
6. **引用关系注意事项**:
   - **引用关系验证**: 创建或更新世界态时，需要验证引用关系是否符合规则
   - **循环引用检测**: 需要检测并阻止循环引用（A引用B，B引用C，C引用A）
   - **时间顺序验证**: 被引用的世界态的时间应该在引用它的世界态之前或同时
   - **引用关系可视化**: 大量引用关系时，可视化可能很复杂，需要支持交互式探索

---

**文档结束**
