-- ETH合约表迁移脚本 - 添加未部署状态支持
-- 执行此脚本以更新现有的eth_contract表

-- 1. 修改status字段，添加'undeployed'状态
ALTER TABLE `eth_contract` 
MODIFY COLUMN `status` enum('undeployed','deployed','pending','failed') 
DEFAULT 'undeployed' 
COMMENT '状态：undeployed-未部署(暂存), deployed-已部署, pending-部署中, failed-部署失败';

-- 2. 修改address字段，允许为NULL（未部署时）
ALTER TABLE `eth_contract` 
MODIFY COLUMN `address` varchar(42) DEFAULT NULL 
COMMENT '合约地址(未部署时为空)';

-- 3. 添加deployer_address字段（如果不存在）
-- 检查是否已存在该字段，如不存在则添加
ALTER TABLE `eth_contract` 
ADD COLUMN IF NOT EXISTS `deployer_address` varchar(42) DEFAULT NULL 
COMMENT '部署者地址' 
AFTER `address`;

-- 4. 修改deployer_account_id字段，允许为NULL
ALTER TABLE `eth_contract` 
MODIFY COLUMN `deployer_account_id` int(11) DEFAULT NULL 
COMMENT '部署者账户ID';

-- 5. 修改network_id字段，允许为NULL
ALTER TABLE `eth_contract` 
MODIFY COLUMN `network_id` int(11) DEFAULT NULL 
COMMENT '网络ID';

-- 6. 添加network字段（如果不存在）
ALTER TABLE `eth_contract` 
ADD COLUMN IF NOT EXISTS `network` varchar(50) DEFAULT NULL 
COMMENT '网络名称' 
AFTER `network_id`;

-- 7. 添加chain_id字段（如果不存在）
ALTER TABLE `eth_contract` 
ADD COLUMN IF NOT EXISTS `chain_id` int(11) DEFAULT NULL 
COMMENT '链ID' 
AFTER `network`;

-- 8. 修改abi和bytecode字段，允许为NULL（用于只保存源代码的暂存合约）
ALTER TABLE `eth_contract` 
MODIFY COLUMN `abi` text 
COMMENT '合约ABI (JSON格式, 未编译时可为空)';

ALTER TABLE `eth_contract` 
MODIFY COLUMN `bytecode` text 
COMMENT '合约字节码(未编译时可为空)';

-- 9. 验证表结构
DESCRIBE `eth_contract`;

-- 10. 查询统计信息
SELECT 
    status,
    COUNT(*) as count,
    COUNT(DISTINCT network) as network_count,
    SUM(CASE WHEN abi IS NULL OR abi = '' THEN 1 ELSE 0 END) as without_abi,
    SUM(CASE WHEN bytecode IS NULL OR bytecode = '' THEN 1 ELSE 0 END) as without_bytecode,
    SUM(CASE WHEN source_code IS NOT NULL AND source_code != '' THEN 1 ELSE 0 END) as with_source_code
FROM `eth_contract`
GROUP BY status;

-- 注意事项：
-- 1. 执行前请备份数据库
-- 2. 如果表中已有数据，请确保deployed状态的合约都有address、abi和bytecode字段
-- 3. MySQL 5.7及以上版本才支持 ADD COLUMN IF NOT EXISTS 语法
-- 4. 如果您使用的是较低版本的MySQL，请手动检查字段是否存在后再添加
-- 5. undeployed状态的合约可以只有源代码，abi和bytecode可以为空

