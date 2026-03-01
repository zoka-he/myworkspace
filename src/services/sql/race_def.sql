-- 族群/种族定义表（主种族 + 亚种，树形，同层按 order_num 排序）
CREATE TABLE IF NOT EXISTS `Race` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `worldview_id` int unsigned NOT NULL COMMENT '世界观 ID',
  `name` varchar(255) NOT NULL DEFAULT '' COMMENT '名称',
  `description` text COMMENT '简述',
  `parent_id` int unsigned NULL DEFAULT NULL COMMENT '父族群 ID，根族群为 NULL',
  `order_num` int NOT NULL DEFAULT 0 COMMENT '同层展示顺序，越小越靠前',
  `embed_document` longtext COMMENT '待嵌入原文，用于向量召回',
  `appearance` text COMMENT '外形',
  `lifespan` varchar(255) NULL COMMENT '寿命',
  `traits` text COMMENT '特质',
  `weaknesses` text COMMENT '弱点',
  `naming_habit` text COMMENT '命名习惯',
  `customs` text COMMENT '习俗',
  `chroma_collection` varchar(255) NULL COMMENT 'ChromaDB collection',
  `chroma_doc_id` varchar(255) NULL COMMENT 'ChromaDB 文档 id',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_worldview_id` (`worldview_id`),
  KEY `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='族群/种族设定';
