-- 阵营定义表新增字段迁移
-- 表名以实际库中为准（Faction / faction 等），执行前请确认
ALTER TABLE `Faction`
  ADD COLUMN `faction_type` VARCHAR(255) NULL COMMENT '阵营类型' AFTER `embed_document`,
  ADD COLUMN `faction_culture` TEXT NULL COMMENT '阵营文化' AFTER `faction_type`,
  ADD COLUMN `ideology_or_meme` TEXT NULL COMMENT '输出或用于整活的文化' AFTER `faction_culture`,
  ADD COLUMN `scale_of_operation` VARCHAR(64) NULL COMMENT '阵营决策尺度：地区级、大陆级、行星级、多星级、文明级' AFTER `ideology_or_meme`,
  ADD COLUMN `decision_taboo` TEXT NULL COMMENT '阵营绝不会做的事情' AFTER `scale_of_operation`,
  ADD COLUMN `primary_threat_model` VARCHAR(512) NULL COMMENT '最大威胁来源' AFTER `decision_taboo`,
  ADD COLUMN `internal_contradictions` TEXT NULL COMMENT '阵营内部允许被公开展示的矛盾' AFTER `primary_threat_model`,
  ADD COLUMN `legitimacy_source` VARCHAR(512) NULL COMMENT '阵营正统来源' AFTER `internal_contradictions`,
  ADD COLUMN `known_dysfunctions` TEXT NULL COMMENT '阵营创伤后遗症' AFTER `legitimacy_source`;
