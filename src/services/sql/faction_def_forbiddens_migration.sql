-- 阵营定义表新增设定禁止项字段
-- 执行前请确认表名（Faction / faction）
ALTER TABLE `Faction`
  ADD COLUMN `forbiddens` TEXT NULL COMMENT '设定禁止项：禁止出现的元素、行为或表达' AFTER `decision_taboo`;
