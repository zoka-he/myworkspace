-- 合约状态迁移脚本：添加 'deprecated'（已作废）状态
-- 执行此脚本前请备份数据库

-- 修改 status 枚举类型，添加 'deprecated' 状态
ALTER TABLE `eth_contract` 
MODIFY COLUMN `status` enum('undeployed','deployed','pending','failed','deprecated') 
DEFAULT 'undeployed' 
COMMENT '状态：undeployed-未部署(暂存), deployed-已部署, pending-部署中, failed-部署失败, deprecated-已作废';

-- 验证修改结果
-- SELECT COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = DATABASE() 
-- AND TABLE_NAME = 'eth_contract' 
-- AND COLUMN_NAME = 'status';

