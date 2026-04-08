-- 角色位置轨迹 + 世界观位置规则
CREATE TABLE IF NOT EXISTS `role_position_timeline` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `worldview_id` bigint unsigned NOT NULL COMMENT '世界观 ID',
  `role_id` bigint unsigned NOT NULL COMMENT '角色定义 ID（Role.id）',
  `role_info_id` bigint unsigned NOT NULL COMMENT '角色版本 ID（role_info.id）',
  `geo_code` varchar(128) NOT NULL COMMENT '当前位置地理编码',
  `occurred_at` bigint NOT NULL COMMENT '发生时间点（时间线秒）',
  `leave_at` bigint NULL DEFAULT NULL COMMENT '离开时间点（时间线秒，可选）',
  `distance_from_prev_km` decimal(12,3) NULL DEFAULT NULL COMMENT '与上一记录距离（公里，可选冗余）',
  `travel_mode` varchar(32) NOT NULL DEFAULT 'walk' COMMENT '移动方式',
  `travel_mode_desc` text NULL COMMENT '移动方式说明',
  `move_purpose` text NULL COMMENT '移动目的',
  `stay_leave_intent_score` int NOT NULL DEFAULT 0 COMMENT '离开(-100)~留驻(100) 意愿',
  `intent_reason` text NULL COMMENT '意愿原因',
  `stay_cost_score` int NOT NULL DEFAULT 0 COMMENT '留驻代价 0~100',
  `leave_cost_score` int NOT NULL DEFAULT 0 COMMENT '离开代价 0~100',
  `stay_cost_reason` text NULL COMMENT '留驻成本原因',
  `leave_cost_reason` text NULL COMMENT '离开成本原因',
  `desired_geo_codes` json NULL COMMENT '角色想去地点列表（geo_code）',
  `desired_reason` text NULL COMMENT '目标地点原因',
  `via_geo_codes` json NULL COMMENT '途经点 geo_code 列表（有序）',
  `move_decision_factors` json NULL COMMENT '移动决断条件（结构化）',
  `decision_reason` text NULL COMMENT '移动决断补充说明',
  `validation_snapshot` json NULL COMMENT '校验快照（warn/block 判定依据）',
  `note` text NULL COMMENT '备注',
  `created_by` varchar(64) NULL DEFAULT NULL COMMENT '创建人',
  `source` varchar(64) NULL DEFAULT NULL COMMENT '来源（manual/ai/import）',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_worldview_role_time` (`worldview_id`, `role_id`, `occurred_at`),
  KEY `idx_role_info_time` (`role_info_id`, `occurred_at`),
  KEY `idx_geo_code` (`geo_code`),
  KEY `idx_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色位置轨迹';

-- 若表已存在且仍是旧字段，可执行迁移：
-- ALTER TABLE `role_position_timeline`
--   ADD COLUMN `stay_cost_reason` text NULL COMMENT '留驻成本原因' AFTER `leave_cost_score`,
--   ADD COLUMN `leave_cost_reason` text NULL COMMENT '离开成本原因' AFTER `stay_cost_reason`;
-- UPDATE `role_position_timeline` SET `stay_cost_reason` = `cost_reason` WHERE `stay_cost_reason` IS NULL;
-- UPDATE `role_position_timeline` SET `leave_cost_reason` = `cost_reason` WHERE `leave_cost_reason` IS NULL;
-- ALTER TABLE `role_position_timeline` DROP COLUMN `cost_reason`;
-- ALTER TABLE `role_position_timeline`
--   ADD COLUMN `travel_mode_desc` text NULL COMMENT '移动方式说明' AFTER `travel_mode`,
--   ADD COLUMN `move_purpose` text NULL COMMENT '移动目的' AFTER `travel_mode_desc`;
-- ALTER TABLE `role_position_timeline`
--   ADD COLUMN `leave_at` bigint NULL DEFAULT NULL COMMENT '离开时间点（时间线秒，可选）' AFTER `occurred_at`;

CREATE TABLE IF NOT EXISTS `worldview_position_rule` (
  `worldview_id` bigint unsigned NOT NULL,
  `enforcement_mode` varchar(16) NOT NULL DEFAULT 'warn' COMMENT 'warn | block',
  `max_speed_by_mode_json` json NULL COMMENT '各移动方式最大速度（km/h）',
  `allow_special_transfer` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否允许特殊传送',
  `special_transfer_requires_tag` varchar(128) NULL DEFAULT NULL COMMENT '特殊传送所需标签',
  `w_distance` decimal(5,3) NOT NULL DEFAULT 0.550,
  `w_intent` decimal(5,3) NOT NULL DEFAULT 0.200,
  `w_stay_cost` decimal(5,3) NOT NULL DEFAULT 0.100,
  `w_leave_cost` decimal(5,3) NOT NULL DEFAULT 0.150,
  `w_desired` decimal(5,3) NOT NULL DEFAULT 0.100,
  `w_path` decimal(5,3) NOT NULL DEFAULT 0.100,
  `w_decision` decimal(5,3) NOT NULL DEFAULT 0.150,
  `ok_threshold` decimal(5,3) NOT NULL DEFAULT 0.600,
  `block_threshold` decimal(5,3) NOT NULL DEFAULT 0.800,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`worldview_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='世界观角色位置规则';
