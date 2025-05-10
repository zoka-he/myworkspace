CREATE TABLE `faction_relation` (
  `id` VARCHAR(36) NOT NULL COMMENT '主键ID',
  `worldview_id` INT NOT NULL COMMENT '世界观ID',
  `source_faction_id` INT NOT NULL COMMENT '源派系ID',
  `target_faction_id` INT NOT NULL COMMENT '目标派系ID',
  `relation_type` ENUM('ally', 'enemy', 'neutral', 'vassal', 'overlord', 'rival', 'protector', 'dependent', 'war') NOT NULL COMMENT '关系类型',
  `relation_strength` INT NOT NULL COMMENT '关系强度',
  `description` TEXT COMMENT '关系描述',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_worldview_id` (`worldview_id`),
  KEY `idx_source_faction_id` (`source_faction_id`),
  KEY `idx_target_faction_id` (`target_faction_id`),
  KEY `idx_relation_type` (`relation_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='派系关系表'; 