-- 角色组主表（PRD 角色组模块）
CREATE TABLE IF NOT EXISTS `role_group` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `worldview_id` int unsigned NOT NULL COMMENT '世界观 ID',
  `name` varchar(255) NOT NULL DEFAULT '' COMMENT '角色组名称',
  `description` text COMMENT '描述',
  `collective_behavior` text COMMENT '集体行动/配合方式说明',
  `group_type` varchar(64) NULL DEFAULT NULL COMMENT '角色组类型：fixed_team/ad_hoc/meeting/master_disciple/family/task_force/antagonist_group/secret_society/other',
  `group_status` varchar(32) NULL DEFAULT 'active' COMMENT '角色组状态：active/dormant/dissolved/ad_hoc_assembled/splitting/reforming',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序',
  `decision_style` text COMMENT '决策方式（扩展）',
  `conflict_points` text COMMENT '冲突点（扩展）',
  `accord_points` text COMMENT '默契点（扩展）',
  `action_pattern` text COMMENT '常见行动模式/剧本（扩展）',
  `group_style` varchar(255) NULL COMMENT '小组风格/节奏（扩展）',
  `shared_goal` text COMMENT '共同目标（扩展）',
  `taboo` text COMMENT '小组禁忌（扩展）',
  `situation_responses` text COMMENT '情境-典型反应 JSON（扩展）',
  `group_mannerisms` text COMMENT '对外一致口径/习惯用语（扩展）',
  `group_type_notes` varchar(500) NULL COMMENT '类型为「其他」时的补充说明（扩展）',
  `status_since` varchar(64) NULL COMMENT '状态变更时间或剧情时间点（扩展）',
  `status_notes` text COMMENT '状态说明如解散原因（扩展）',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_worldview_id` (`worldview_id`),
  KEY `idx_group_type` (`group_type`),
  KEY `idx_group_status` (`group_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色组';

-- 角色组成员表
CREATE TABLE IF NOT EXISTS `role_group_member` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `role_group_id` int unsigned NOT NULL COMMENT '角色组 ID',
  `role_info_id` int unsigned NOT NULL COMMENT '角色信息 ID（role_info.id）',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '组内排序',
  `role_in_group` varchar(64) NULL COMMENT '组内角色/分工（扩展）',
  `notes_with_others` text COMMENT '与组内他人的关系/互动备注（扩展）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_role` (`role_group_id`, `role_info_id`),
  KEY `idx_role_group_id` (`role_group_id`),
  KEY `idx_role_info_id` (`role_info_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色组成员';
