# 技能系统关联配置设计方案（LLM生成优化版）

## 问题分析

技能系统与阵营、角色都有关系，需要设计一个合理的功能模块来管理这些关联关系。

**关键考虑**：如果希望借助LLM进行技能生成，生成入口应该放在角色/阵营中，因为：
1. **上下文更丰富**：角色和阵营有完整的背景信息（性格、背景、所属关系等）
2. **生成更精准**：基于角色/阵营的特点生成技能更符合设定
3. **符合工作流**：用户通常在编辑角色/阵营时想到需要配置技能

## 设计方案（混合方案）

### 1. 架构设计原则

- **技能系统定义**：在 `magicSystemManage` 模块中定义技能系统的规则、框架、版本
- **技能生成入口**：在 `roleManage` 和 `factionManage` 模块中提供"生成技能"功能
- **关联管理**：在 `magicSystemManage` 模块中查看和管理关联关系
- **一致性**：遵循与 `roleManage` 和 `factionManage` 相同的架构模式
- **模块化**：使用标签页切换不同的功能面板

### 2. 功能模块结构

#### 2.1 技能系统管理模块（magicSystemManage）

```
magicSystemManage/
├── index.tsx                    # 主入口，添加标签页切换
├── components/
│   ├── SystemTree.tsx           # 左侧系统树（已有）
│   ├── SystemInfo.tsx           # 系统信息面板（已有）
│   ├── VersionManage.tsx        # 版本管理面板（已有）
│   └── RelationConfig.tsx       # 新增：关联配置面板（查看和管理关联）
│       ├── FactionRelationPanel.tsx    # 技能系统-阵营关联列表
│       └── RoleRelationPanel.tsx       # 技能系统-角色关联列表
```

#### 2.2 角色管理模块（roleManage）- 添加技能生成功能

```
roleManage/
├── edit/
│   └── roleInfoEditModal.tsx    # 角色编辑模态框（已有）
│       └── 新增：技能配置标签页
│           ├── SkillGeneratePanel.tsx   # LLM技能生成面板
│           └── SkillRelationList.tsx    # 角色已关联的技能列表
```

#### 2.3 阵营管理模块（factionManage）- 添加技能生成功能

```
factionManage/
├── panels/
│   └── factionInfoPanel.tsx     # 阵营信息面板（已有）
│       └── 新增：技能配置区域
│           ├── SkillGeneratePanel.tsx   # LLM技能生成面板
│           └── SkillRelationList.tsx    # 阵营已关联的技能列表
```

### 3. UI 布局设计

#### 3.1 技能系统管理模块 - 添加关联配置标签页

参考 `roleManage/index.tsx` 的设计模式：

```tsx
<Card title={
  <Radio.Group value={activePanel} onChange={...}>
    <Radio.Button value="info">系统信息</Radio.Button>
    <Radio.Button value="version">版本管理</Radio.Button>
    <Radio.Button value="relation">关联配置</Radio.Button>
  </Radio.Group>
}>
  {content}
</Card>
```

#### 3.2 角色编辑模态框 - 添加技能配置标签页

在 `roleInfoEditModal.tsx` 中添加新的标签页：

```tsx
<Tabs>
  <TabPane key="basic" tab="基本信息">...</TabPane>
  <TabPane key="skill" tab="技能配置">
    <SkillGeneratePanel 
      roleInfo={currentRoleInfo}
      worldviewId={worldviewId}
      onGenerate={handleGenerateSkill}
    />
    <SkillRelationList 
      roleId={roleId}
      worldviewId={worldviewId}
    />
  </TabPane>
</Tabs>
```

#### 3.3 阵营信息面板 - 添加技能配置区域

在 `factionInfoPanel.tsx` 中添加技能配置区域：

```tsx
<Card title="技能配置">
  <SkillGeneratePanel 
    factionInfo={currentFaction}
    worldviewId={worldviewId}
    onGenerate={handleGenerateSkill}
  />
  <SkillRelationList 
    factionId={factionId}
    worldviewId={worldviewId}
  />
</Card>
```

### 4. 数据库设计

需要创建两个关联表：

#### 4.1 技能系统-阵营关联表

```sql
CREATE TABLE `magic_system_faction_relation` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `worldview_id` INT NOT NULL COMMENT '世界观ID',
  `magic_system_id` INT NOT NULL COMMENT '技能系统ID',
  `faction_id` INT NOT NULL COMMENT '阵营ID',
  `relation_type` ENUM('available', 'exclusive', 'restricted', 'forbidden') 
    NOT NULL DEFAULT 'available' COMMENT '关联类型：可用/专属/受限/禁止',
  `description` TEXT COMMENT '关联描述',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_system_faction` (`magic_system_id`, `faction_id`),
  KEY `idx_worldview_id` (`worldview_id`),
  KEY `idx_magic_system_id` (`magic_system_id`),
  KEY `idx_faction_id` (`faction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='技能系统与阵营关联表';
```

#### 4.2 技能系统-角色关联表

```sql
CREATE TABLE `magic_system_role_relation` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `worldview_id` INT NOT NULL COMMENT '世界观ID',
  `magic_system_id` INT NOT NULL COMMENT '技能系统ID',
  `role_id` INT NOT NULL COMMENT '角色ID（role_info.id）',
  `relation_type` ENUM('mastered', 'learning', 'available', 'restricted', 'forbidden') 
    NOT NULL DEFAULT 'available' COMMENT '关联类型：精通/学习中/可用/受限/禁止',
  `proficiency_level` INT DEFAULT 0 COMMENT '熟练度等级（0-100）',
  `description` TEXT COMMENT '关联描述',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_system_role` (`magic_system_id`, `role_id`),
  KEY `idx_worldview_id` (`worldview_id`),
  KEY `idx_magic_system_id` (`magic_system_id`),
  KEY `idx_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='技能系统与角色关联表';
```

### 5. 类型定义

在 `src/types/IAiNoval.ts` 中添加：

```typescript
// 技能系统-阵营关联
export interface IMagicSystemFactionRelation {
  id?: number;
  worldview_id: number;
  magic_system_id: number;
  faction_id: number;
  relation_type: 'available' | 'exclusive' | 'restricted' | 'forbidden';
  description?: string;
  created_at?: Date;
  updated_at?: Date;
}

// 技能系统-角色关联
export interface IMagicSystemRoleRelation {
  id?: number;
  worldview_id: number;
  magic_system_id: number;
  role_id: number;
  relation_type: 'mastered' | 'learning' | 'available' | 'restricted' | 'forbidden';
  proficiency_level?: number;
  description?: string;
  created_at?: Date;
  updated_at?: Date;
}
```

### 6. 功能特性

#### 6.1 技能系统管理模块 - 关联配置面板

**功能定位**：查看和管理技能系统与阵营/角色的关联关系

- **技能系统-阵营关联列表**
  - 查看当前技能系统关联的所有阵营
  - 编辑/删除关联关系
  - 支持关联类型：
    - **available**：阵营可以使用该技能系统
    - **exclusive**：阵营专属该技能系统
    - **restricted**：阵营受限使用该技能系统
    - **forbidden**：阵营禁止使用该技能系统

- **技能系统-角色关联列表**
  - 查看当前技能系统关联的所有角色
  - 编辑/删除关联关系
  - 支持关联类型：
    - **mastered**：角色已精通该技能系统
    - **learning**：角色正在学习该技能系统
    - **available**：角色可以使用该技能系统
    - **restricted**：角色受限使用该技能系统
    - **forbidden**：角色禁止使用该技能系统
  - 支持设置熟练度等级（0-100）

#### 6.2 角色管理模块 - 技能生成功能

**功能定位**：基于角色信息，使用LLM生成适合的技能配置

- **技能生成面板** (`SkillGeneratePanel.tsx`)
  - 输入：
    - 角色基本信息（自动获取：名称、性别、年龄、性格、背景、所属阵营等）
    - 可用的技能系统列表（从世界观中获取）
    - 额外要求（用户输入）
  - LLM生成：
    - 根据角色信息和技能系统规则，生成适合该角色的技能配置
    - 包括：技能类型、熟练度、技能描述等
  - 输出：
    - 生成技能配置建议
    - 一键保存为关联关系

- **技能关联列表** (`SkillRelationList.tsx`)
  - 显示角色已关联的所有技能系统
  - 支持编辑熟练度、关联类型
  - 支持删除关联

#### 6.3 阵营管理模块 - 技能生成功能

**功能定位**：基于阵营信息，使用LLM生成适合的技能配置

- **技能生成面板** (`SkillGeneratePanel.tsx`)
  - 输入：
    - 阵营基本信息（自动获取：名称、描述、科技特点、军事力量等）
    - 可用的技能系统列表（从世界观中获取）
    - 额外要求（用户输入）
  - LLM生成：
    - 根据阵营信息和技能系统规则，生成适合该阵营的技能配置
    - 包括：技能类型、使用范围、技能描述等
  - 输出：
    - 生成技能配置建议
    - 一键保存为关联关系

- **技能关联列表** (`SkillRelationList.tsx`)
  - 显示阵营已关联的所有技能系统
  - 支持编辑关联类型
  - 支持删除关联

### 7. LLM技能生成API设计

#### 7.1 角色技能生成API

```typescript
// pages/api/web/aiNoval/llm/once/generateRoleSkill.ts

interface GenerateRoleSkillRequest {
  worldviewId: number;
  roleId: number;
  magicSystemId: number;  // 可选，如果指定则生成该系统的技能
  extraRequirements?: string;
}

interface GenerateRoleSkillResponse {
  skillConfig: {
    relationType: 'mastered' | 'learning' | 'available' | 'restricted';
    proficiencyLevel: number;  // 0-100
    skillDescription: string;  // 生成的技能描述
    suggestedSkills: string[];  // 建议的具体技能列表
  };
}
```

#### 7.2 阵营技能生成API

```typescript
// pages/api/web/aiNoval/llm/once/generateFactionSkill.ts

interface GenerateFactionSkillRequest {
  worldviewId: number;
  factionId: number;
  magicSystemId: number;  // 可选，如果指定则生成该系统的技能
  extraRequirements?: string;
}

interface GenerateFactionSkillResponse {
  skillConfig: {
    relationType: 'available' | 'exclusive' | 'restricted';
    skillDescription: string;  // 生成的技能描述
    suggestedSkills: string[];  // 建议的具体技能列表
    usageScope: string;  // 使用范围描述
  };
}
```

#### 7.3 Prompt模板设计

**角色技能生成Prompt**：
```
你是一个小说世界构建助手。请根据以下信息，为该角色生成适合的技能配置。

【角色信息】
- 名称：{roleName}
- 性别：{gender}
- 年龄：{age}
- 性格：{personality}
- 背景：{background}
- 所属阵营：{factionName}

【技能系统规则】
{magicSystemContent}

【额外要求】
{extraRequirements}

请生成：
1. 该角色应该掌握的技能类型和熟练度（0-100）
2. 具体的技能列表和建议
3. 技能描述（说明该角色如何使用这些技能）

输出格式：JSON
```

**阵营技能生成Prompt**：
```
你是一个小说世界构建助手。请根据以下信息，为该阵营生成适合的技能配置。

【阵营信息】
- 名称：{factionName}
- 描述：{description}
- 科技特点：{techFeatures}
- 军事力量：{militaryPower}

【技能系统规则】
{magicSystemContent}

【额外要求】
{extraRequirements}

请生成：
1. 该阵营应该掌握的技能类型
2. 具体的技能列表和建议
3. 技能使用范围（哪些成员可以使用、使用限制等）
4. 技能描述

输出格式：JSON
```

### 8. 实现步骤

#### 阶段一：基础关联管理
1. **创建数据库表**（如果还没有）
2. **添加类型定义**
3. **创建 Service 层**（参考 `factionRelationService.js`）
4. **创建 API 接口**（参考 `faction/relation`）
5. **在技能系统管理中创建关联配置面板**
6. **修改技能系统管理主入口文件，添加标签页切换**

#### 阶段二：LLM技能生成功能
7. **创建LLM技能生成API**（角色和阵营）
8. **在角色编辑模态框中添加技能配置标签页**
9. **创建角色技能生成面板组件**
10. **在阵营信息面板中添加技能配置区域**
11. **创建阵营技能生成面板组件**
12. **实现技能关联列表组件**（角色和阵营共用）

### 9. 优势

#### 9.1 混合方案的优势

- ✅ **技能生成更精准**：基于角色/阵营的完整上下文生成技能，更符合设定
- ✅ **符合工作流**：用户在编辑角色/阵营时自然想到配置技能
- ✅ **集中管理**：技能系统定义和关联关系管理集中在技能系统模块
- ✅ **架构一致**：与角色管理、阵营管理保持一致的架构模式
- ✅ **易于维护**：关联关系集中管理，便于查询和维护
- ✅ **扩展性好**：未来可以轻松添加更多关联类型或功能

#### 9.2 与现有功能的整合

- **角色嵌入文档生成**：已有 `generateRoleEmbedText`，可以复用类似的模式
- **阵营嵌入文档生成**：已有 `generateFactionEmbedText`，可以复用类似的模式
- **角色生成面板**：已有 `GenRolePanel`，可以参考其设计模式

## 推荐方案

**推荐采用混合方案**：

1. **技能系统定义和管理**：在 `magicSystemManage` 模块中
   - 定义技能系统的规则、框架、版本
   - 查看和管理技能系统与阵营/角色的关联关系

2. **技能生成入口**：在 `roleManage` 和 `factionManage` 模块中
   - 基于角色/阵营的完整信息，使用LLM生成适合的技能配置
   - 提供友好的生成界面和结果展示

3. **关联关系管理**：双向管理
   - 在技能系统管理中：查看某个技能系统关联了哪些角色/阵营
   - 在角色/阵营管理中：查看某个角色/阵营关联了哪些技能系统

这样的设计既保持了架构的一致性，又充分利用了角色/阵营的上下文信息，使LLM生成更加精准。
