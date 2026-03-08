-- 角色记忆表（与章节发展关联、支持优先级与槽位指向性）
CREATE TABLE IF NOT EXISTS `role_memory` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `worldview_id` bigint unsigned NOT NULL COMMENT '世界观 ID',
  `role_info_id` bigint unsigned NOT NULL COMMENT '角色信息 ID（role_info.id）',
  `chapter_id` bigint unsigned NULL DEFAULT NULL COMMENT '关联章节（scope=at_chapter 时使用）',
  `scope` varchar(32) NOT NULL DEFAULT 'global' COMMENT '作用范围：global / from_chapter / at_chapter',
  `start_chapter_id` bigint unsigned NULL DEFAULT NULL COMMENT 'scope=from_chapter 时生效起始章节',
  `end_chapter_id` bigint unsigned NULL DEFAULT NULL COMMENT 'scope=from_chapter 时生效结束章节（NULL 表示至今有效）',
  `content` text NOT NULL COMMENT '记忆内容',
  `impact_summary` text NULL COMMENT '此记忆对角色构成的影响摘要（如：不再信任A，动机转为复仇）',
  `importance` varchar(20) NOT NULL DEFAULT 'medium' COMMENT '重要性（词汇）：critical关键/high重要/medium一般/low参考/marginal备选',
  `memory_type` varchar(50) NULL DEFAULT NULL COMMENT '叙事类型：fact/relationship_change/goal/secret/trauma/key_experience/rule',
  `affects_slot` varchar(32) NULL DEFAULT NULL COMMENT '主要影响的角色构成维度',
  `affects_slots` json NULL DEFAULT NULL COMMENT '多靶点，如 ["goal","relationship"]',
  `related_role_info_id` bigint unsigned NULL DEFAULT NULL COMMENT '当影响关系时，对哪一角色',
  `narrative_usage` varchar(20) NULL DEFAULT NULL COMMENT '剧情中的使用：mingxian明线/anxian暗线（暗线仅作动机与伏笔，不在叙述中直接写出）',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '同重要性下展示顺序',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_worldview_role` (`worldview_id`, `role_info_id`),
  KEY `idx_scope_chapter` (`scope`, `chapter_id`),
  KEY `idx_affects_slot` (`affects_slot`),
  KEY `idx_memory_type` (`memory_type`),
  KEY `idx_importance` (`importance`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色记忆';

-- 已有表时单独执行：增加影响摘要字段（方案 A）
-- ALTER TABLE `role_memory` ADD COLUMN `impact_summary` text NULL COMMENT '此记忆对角色构成的影响摘要' AFTER `content`;

-- 已有表时单独执行：增加剧情使用方式（明线/暗线）
-- ALTER TABLE `role_memory` ADD COLUMN `narrative_usage` varchar(20) NULL DEFAULT NULL COMMENT '剧情中的使用：mingxian明线/anxian暗线' AFTER `related_role_info_id`;

-- 已有表：优先级改为重要性（词汇）
-- ALTER TABLE `role_memory` ADD COLUMN `importance` varchar(20) NOT NULL DEFAULT 'medium' COMMENT '重要性：critical/high/medium/low/marginal' AFTER `impact_summary`;
-- UPDATE `role_memory` SET importance = CASE WHEN priority = 1 THEN 'critical' WHEN priority = 2 THEN 'high' WHEN priority = 3 THEN 'medium' WHEN priority = 4 THEN 'low' WHEN priority = 5 THEN 'marginal' ELSE 'medium' END WHERE priority IS NOT NULL;
-- ALTER TABLE `role_memory` DROP COLUMN `priority`;
