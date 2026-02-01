-- 阵营定义表新增命名规范字段
-- 执行前请确认表名（Faction / faction）
-- 用于创作建议面板中根据阵营自动生成地名命名约束

ALTER TABLE `Faction`
  ADD COLUMN `geo_naming_habit` TEXT NULL COMMENT '地理·命名习惯：风格、偏好、通用要求' AFTER `known_dysfunctions`,
  ADD COLUMN `geo_naming_suffix` TEXT NULL COMMENT '地理·命名后缀：后缀及层级对应' AFTER `geo_naming_habit`,
  ADD COLUMN `geo_naming_prohibition` TEXT NULL COMMENT '地理·命名禁忌：严禁事项' AFTER `geo_naming_suffix`;
