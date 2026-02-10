# 脑洞模块字段更新迁移指南

## 更新内容

### 1. 分离用户问题和扩展问题

**新增字段：**
- `user_question` (text) - 用户原始问题
- `expanded_questions` (text) - 扩展后的问题（通过 ReAct+MCP 生成）

**保留字段（向后兼容）：**
- `analysis_direction` (text) - 分析方向（已废弃，保留用于向后兼容）

### 2. 父脑洞从单个改为多个

**新增字段：**
- `parent_ids` (json) - 父脑洞ID列表（支持多个父脑洞）

**保留字段（向后兼容）：**
- `parent_id` (bigint) - 父脑洞ID（单个，已废弃，保留用于向后兼容）

## 数据库迁移SQL

```sql
-- 1. 添加用户问题和扩展问题字段
ALTER TABLE `brainstorm` 
ADD COLUMN `user_question` text COMMENT '用户原始问题' AFTER `category`,
ADD COLUMN `expanded_questions` text COMMENT '扩展后的问题（通过 ReAct+MCP 生成）' AFTER `user_question`;

-- 2. 添加父脑洞ID列表字段（JSON格式）
ALTER TABLE `brainstorm` 
ADD COLUMN `parent_ids` json COMMENT '父脑洞ID列表（支持多个父脑洞）' AFTER `related_world_state_ids`;

-- 3. 数据迁移：将现有的 parent_id 迁移到 parent_ids（如果 parent_id 存在且 parent_ids 为空）
UPDATE `brainstorm` 
SET `parent_ids` = JSON_ARRAY(`parent_id`) 
WHERE `parent_id` IS NOT NULL 
  AND (`parent_ids` IS NULL OR JSON_LENGTH(`parent_ids`) = 0);

-- 4. 数据迁移：将现有的 analysis_direction 迁移到 expanded_questions（如果 expanded_questions 为空）
UPDATE `brainstorm` 
SET `expanded_questions` = `analysis_direction` 
WHERE `analysis_direction` IS NOT NULL 
  AND `analysis_direction` != '' 
  AND (`expanded_questions` IS NULL OR `expanded_questions` = '');

-- 5. 添加索引（可选，如果需要按父脑洞查询）
-- 注意：MySQL 5.7+ 支持 JSON 字段的虚拟列索引
ALTER TABLE `brainstorm` 
ADD INDEX `idx_parent_ids` ((CAST(`parent_ids` AS CHAR(255) ARRAY)));
```

## 向后兼容说明

### 代码层面的兼容性处理

1. **类型定义**：`IBrainstorm` 接口同时支持 `parent_id` 和 `parent_ids`
2. **Service层**：`brainstormService.js` 中同时支持两个字段
3. **前端组件**：
   - 表单初始化时，如果只有 `parent_id`，会自动转换为 `parent_ids` 数组
   - 查询时优先使用 `parent_ids`，如果没有则回退到 `parent_id`

### 数据迁移建议

1. **渐进式迁移**：
   - 先执行 SQL 添加新字段
   - 运行数据迁移脚本
   - 逐步更新代码使用新字段
   - 最后清理旧字段（可选）

2. **回滚方案**：
   - 保留 `parent_id` 和 `analysis_direction` 字段
   - 代码同时支持新旧字段
   - 如需回滚，只需恢复旧代码即可

## 验证步骤

1. **验证新字段**：
```sql
-- 检查新字段是否存在
DESCRIBE `brainstorm`;

-- 检查数据迁移是否成功
SELECT id, parent_id, parent_ids, analysis_direction, expanded_questions 
FROM `brainstorm` 
WHERE parent_id IS NOT NULL OR parent_ids IS NOT NULL 
LIMIT 10;
```

2. **验证功能**：
   - 创建新脑洞，测试 `user_question` 和 `expanded_questions` 字段
   - 测试多选父脑洞功能
   - 验证向后兼容（旧数据仍能正常显示）

## 注意事项

1. **JSON字段格式**：`parent_ids` 使用 JSON 数组格式，例如：`[1, 2, 3]`
2. **查询性能**：如果经常需要按父脑洞查询，考虑添加虚拟列索引
3. **数据一致性**：迁移后建议定期检查 `parent_id` 和 `parent_ids` 的一致性

## 迁移时间估算

- 数据库迁移：5-10分钟（取决于数据量）
- 代码更新：已完成
- 测试验证：30分钟-1小时

---

**创建日期**：2026-02-09  
**版本**：v1.0
