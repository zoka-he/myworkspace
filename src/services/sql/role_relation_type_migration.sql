-- 角色关系类型表（与 IRoleRelationType、roleRelationTypeService 一致）
-- 自 RELATION_TYPES（src/types/IAiNoval.ts）迁移：value→id, presetStrength→default_strength, color→default_color

CREATE TABLE IF NOT EXISTS `role_relation_type` (
  `id` VARCHAR(64) NOT NULL COMMENT '类型编码，对应 role_relations.relation_type',
  `label` VARCHAR(128) NOT NULL COMMENT '显示名称',
  `default_strength` TINYINT UNSIGNED NOT NULL DEFAULT 50 COMMENT '默认亲密度 0-100',
  `default_color` VARCHAR(32) NOT NULL DEFAULT 'default' COMMENT 'Ant Design Tag 色名',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色关系类型定义';

INSERT INTO `role_relation_type` (`id`, `label`, `default_strength`, `default_color`) VALUES
('friend', '朋友', 80, 'blue'),
('confidant', '知己', 85, 'blue'),
('enemy', '敌人', 20, 'red'),
('frenemy', '亦敌亦友', 45, 'orange'),
('nemesis', '宿敌', 15, 'red'),
('acquaintance', '熟人', 50, 'blue'),
('stranger', '陌生人', 30, 'default'),
('family', '家人', 90, 'green'),
('sibling', '兄弟姐妹', 85, 'green'),
('parent', '父母', 90, 'green'),
('child', '子女', 90, 'green'),
('cousin', '表亲', 75, 'green'),
('lover', '恋人', 95, 'pink'),
('rival', '对手', 40, 'orange'),
('mentor', '导师', 75, 'cyan'),
('mentee', '学生', 70, 'purple'),
('apprentice', '学徒', 70, 'purple'),
('classmate', '同学', 70, 'purple'),
('leader', '领导', 75, 'cyan'),
('subordinate', '下属', 60, 'geekblue'),
('colleague', '同事', 60, 'geekblue'),
('ally', '盟友', 70, 'lime'),
('betrayer', '背叛者', 10, 'volcano'),
('guardian', '监护人', 80, 'purple'),
('protector', '保护者', 85, 'blue'),
('benefactor', '恩人', 80, 'cyan'),
('business_partner', '商业伙伴', 65, 'geekblue'),
('debtor', '欠债人', 30, 'orange'),
('creditor', '债主', 30, 'orange'),
('competitor', '竞争者', 35, 'orange'),
('neighbor', '邻居', 55, 'blue'),
('believer', '信徒', 75, 'gold'),
('priest', '神职人员', 80, 'gold'),
('deity', '神明', 95, 'gold'),
('disciple', '门徒', 85, 'gold'),
('prophet', '先知', 90, 'gold'),
('heretic', '异教徒', 20, 'red'),
('cultist', '教派成员', 70, 'purple'),
('religious_leader', '宗教领袖', 85, 'gold'),
('worshipper', '崇拜者', 80, 'gold'),
('apostle', '使徒', 85, 'gold'),
('other', '其他', 50, 'default')
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `default_strength` = VALUES(`default_strength`),
  `default_color` = VALUES(`default_color`);
