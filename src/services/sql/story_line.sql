CREATE TABLE IF NOT EXISTS `story_line` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `worldview_id` bigint NOT NULL COMMENT '世界观ID',
  `name` varchar(100) NOT NULL COMMENT '故事线名称',
  `type` varchar(50) NOT NULL COMMENT '故事线类型',
  `description` text COMMENT '故事线描述',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_worldview_id` (`worldview_id`),
  KEY `idx_type` (`type`),
  CONSTRAINT `fk_story_line_worldview` FOREIGN KEY (`worldview_id`) REFERENCES `worldview` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='故事线表'; 