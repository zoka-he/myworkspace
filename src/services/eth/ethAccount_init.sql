-- ETH账户管理表
CREATE TABLE IF NOT EXISTS `eth_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '账户名称',
  `address` varchar(42) NOT NULL COMMENT '钱包地址',
  `private_key` text COMMENT '私钥（加密存储）',
  `balance` decimal(20,8) DEFAULT 0.00000000 COMMENT '余额（ETH）',
  `network` enum('mainnet','testnet','ropsten','rinkeby','goerli') NOT NULL DEFAULT 'mainnet' COMMENT '网络类型',
  `remark` text COMMENT '备注',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_address` (`address`),
  KEY `idx_name` (`name`),
  KEY `idx_network` (`network`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ETH账户管理表';

-- ETH交易记录表
CREATE TABLE IF NOT EXISTS `eth_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `account_id` int(11) NOT NULL COMMENT '账户ID',
  `tx_hash` varchar(66) NOT NULL COMMENT '交易哈希',
  `from_address` varchar(42) NOT NULL COMMENT '发送地址',
  `to_address` varchar(42) NOT NULL COMMENT '接收地址',
  `value` decimal(20,8) NOT NULL COMMENT '交易金额（ETH）',
  `gas_price` bigint(20) NOT NULL COMMENT 'Gas价格',
  `gas_limit` bigint(20) NOT NULL COMMENT 'Gas限制',
  `nonce` int(11) NOT NULL COMMENT 'Nonce',
  `status` enum('pending','confirmed','failed') NOT NULL DEFAULT 'pending' COMMENT '交易状态',
  `block_number` bigint(20) DEFAULT NULL COMMENT '区块号',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tx_hash` (`tx_hash`),
  KEY `idx_account_id` (`account_id`),
  KEY `idx_from_address` (`from_address`),
  KEY `idx_to_address` (`to_address`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`),
  CONSTRAINT `fk_eth_tx_account` FOREIGN KEY (`account_id`) REFERENCES `eth_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ETH交易记录表';

-- 网络配置表
CREATE TABLE IF NOT EXISTS `eth_networks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL COMMENT '网络名称',
  `chain_id` int(11) NOT NULL COMMENT '链ID',
  `rpc_url` varchar(255) NOT NULL COMMENT 'RPC地址',
  `explorer_url` varchar(255) NOT NULL COMMENT '浏览器地址',
  `is_testnet` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否测试网',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_chain_id` (`chain_id`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ETH网络配置表';

-- 插入默认网络配置
INSERT INTO `eth_networks` (`name`, `chain_id`, `rpc_url`, `explorer_url`, `is_testnet`) VALUES
('mainnet', 1, 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID', 'https://etherscan.io', 0),
('ropsten', 3, 'https://ropsten.infura.io/v3/YOUR_PROJECT_ID', 'https://ropsten.etherscan.io', 1),
('rinkeby', 4, 'https://rinkeby.infura.io/v3/YOUR_PROJECT_ID', 'https://rinkeby.etherscan.io', 1),
('goerli', 5, 'https://goerli.infura.io/v3/YOUR_PROJECT_ID', 'https://goerli.etherscan.io', 1);
