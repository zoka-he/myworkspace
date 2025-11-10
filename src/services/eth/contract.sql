-- ETH智能合约管理系统数据库表

-- 合约表
CREATE TABLE IF NOT EXISTS `eth_contract` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '合约ID',
  `name` varchar(100) NOT NULL COMMENT '合约名称',
  `address` varchar(42) DEFAULT NULL COMMENT '合约地址(未部署时为空)',
  `deployer_address` varchar(42) DEFAULT NULL COMMENT '部署者地址',
  `deployer_account_id` int(11) DEFAULT NULL COMMENT '部署者账户ID',
  `network_id` int(11) DEFAULT NULL COMMENT '网络ID',
  `network` varchar(50) DEFAULT NULL COMMENT '网络名称',
  `chain_id` int(11) DEFAULT NULL COMMENT '链ID',
  `abi` text COMMENT '合约ABI (JSON格式, 未编译时可为空)',
  `bytecode` text COMMENT '合约字节码(未编译时可为空)',
  `source_code` text COMMENT '源代码',
  `constructor_params` text COMMENT '构造函数参数 (JSON格式)',
  `status` enum('undeployed','deployed','pending','failed') DEFAULT 'undeployed' COMMENT '状态：undeployed-未部署(暂存), deployed-已部署, pending-部署中, failed-部署失败',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_address` (`address`),
  KEY `idx_network_id` (`network_id`),
  KEY `idx_deployer` (`deployer_account_id`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='智能合约表';

-- 合约部署历史表（可选）
CREATE TABLE IF NOT EXISTS `eth_contract_deploy_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '历史ID',
  `contract_id` int(11) NOT NULL COMMENT '合约ID',
  `transaction_hash` varchar(66) NOT NULL COMMENT '交易哈希',
  `deployer_account_id` int(11) NOT NULL COMMENT '部署者账户ID',
  `network_id` int(11) NOT NULL COMMENT '网络ID',
  `gas_used` varchar(50) COMMENT '使用的Gas',
  `gas_price` varchar(50) COMMENT 'Gas价格',
  `status` enum('pending','confirmed','failed') DEFAULT 'pending' COMMENT '状态',
  `block_number` int(11) COMMENT '区块号',
  `error_message` text COMMENT '错误信息',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_contract_id` (`contract_id`),
  KEY `idx_transaction_hash` (`transaction_hash`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='合约部署历史表';

-- 合约交互历史表（可选）
CREATE TABLE IF NOT EXISTS `eth_contract_interact_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '历史ID',
  `contract_id` int(11) NOT NULL COMMENT '合约ID',
  `method_name` varchar(100) NOT NULL COMMENT '方法名称',
  `params` text COMMENT '参数 (JSON格式)',
  `caller_address` varchar(42) NOT NULL COMMENT '调用者地址',
  `transaction_hash` varchar(66) COMMENT '交易哈希（如果是交易）',
  `status` enum('pending','success','failed') DEFAULT 'pending' COMMENT '状态',
  `result` text COMMENT '返回结果',
  `error` text COMMENT '错误信息',
  `gas_used` varchar(50) COMMENT '使用的Gas',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_contract_id` (`contract_id`),
  KEY `idx_method_name` (`method_name`),
  KEY `idx_caller` (`caller_address`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='合约交互历史表';

-- 如果需要，可以添加外键约束
-- ALTER TABLE `eth_contract` 
--   ADD CONSTRAINT `fk_contract_account` 
--   FOREIGN KEY (`deployer_account_id`) 
--   REFERENCES `eth_account` (`id`) 
--   ON DELETE RESTRICT;

-- ALTER TABLE `eth_contract` 
--   ADD CONSTRAINT `fk_contract_network` 
--   FOREIGN KEY (`network_id`) 
--   REFERENCES `eth_network` (`id`) 
--   ON DELETE RESTRICT;

-- 插入示例数据（可选）
-- INSERT INTO `eth_contract` (
--   `name`, `address`, `deployer_address`, `deployer_account_id`,
--   `network_id`, `network`, `chain_id`, `abi`, `bytecode`,
--   `source_code`, `status`, `remark`
-- ) VALUES (
--   'SimpleStorage',
--   '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
--   '0x1234567890123456789012345678901234567890',
--   1,
--   1,
--   'sepolia',
--   11155111,
--   '[{"type":"constructor","inputs":[],"stateMutability":"nonpayable"}]',
--   '0x608060405234801561001057600080fd5b50...',
--   'pragma solidity ^0.8.0; contract SimpleStorage {...}',
--   'deployed',
--   '测试合约'
-- );

-- 创建视图：合约统计
CREATE OR REPLACE VIEW `v_eth_contract_stats` AS
SELECT 
    network,
    chain_id,
    status,
    COUNT(*) as contract_count,
    COUNT(DISTINCT deployer_account_id) as deployer_count,
    MIN(create_time) as first_deploy_time,
    MAX(create_time) as last_deploy_time
FROM eth_contract
GROUP BY network, chain_id, status;

-- 创建视图：合约详情（包含部署账户信息）
CREATE OR REPLACE VIEW `v_eth_contract_detail` AS
SELECT 
    c.id,
    c.name as contract_name,
    c.address as contract_address,
    c.network,
    c.chain_id,
    c.status,
    c.create_time,
    c.remark,
    a.name as deployer_name,
    a.address as deployer_address,
    a.balance as deployer_balance,
    n.name as network_full_name,
    n.rpc_url,
    n.explorer_url
FROM eth_contract c
LEFT JOIN eth_account a ON c.deployer_account_id = a.id
LEFT JOIN eth_network n ON c.network_id = n.id;

-- 创建索引优化查询
CREATE INDEX idx_contract_name ON eth_contract(name);
CREATE INDEX idx_contract_address_network ON eth_contract(address, network_id);

-- 查询示例

-- 1. 查询所有已部署的合约
-- SELECT * FROM eth_contract WHERE status = 'deployed' ORDER BY create_time DESC;

-- 2. 查询指定网络的合约
-- SELECT * FROM eth_contract WHERE network = 'sepolia' AND status = 'deployed';

-- 3. 查询指定部署者的合约
-- SELECT * FROM eth_contract WHERE deployer_account_id = 1;

-- 4. 查询合约统计
-- SELECT * FROM v_eth_contract_stats ORDER BY contract_count DESC;

-- 5. 查询合约详情
-- SELECT * FROM v_eth_contract_detail WHERE contract_name LIKE '%Storage%';

-- 6. 查询最近部署的合约
-- SELECT * FROM eth_contract ORDER BY create_time DESC LIMIT 10;

-- 7. 统计每个网络的合约数量
-- SELECT network, COUNT(*) as count FROM eth_contract GROUP BY network;

-- 8. 查询包含特定方法的合约（需要解析ABI）
-- SELECT id, name, address FROM eth_contract 
-- WHERE abi LIKE '%"name":"transfer"%';

