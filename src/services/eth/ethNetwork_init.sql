-- ETH网络配置表
CREATE TABLE IF NOT EXISTS `eth_networks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '网络名称',
  `chain_id` int(11) NOT NULL COMMENT '链ID',
  `rpc_url` varchar(500) NOT NULL COMMENT 'RPC节点URL',
  `explorer_url` varchar(500) NOT NULL COMMENT '区块链浏览器URL',
  `is_testnet` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否为测试网',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_chain_id` (`chain_id`),
  KEY `idx_name` (`name`),
  KEY `idx_is_testnet` (`is_testnet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ETH网络配置表';

-- 插入默认网络配置
INSERT INTO `eth_networks` (`name`, `chain_id`, `rpc_url`, `explorer_url`, `is_testnet`) VALUES
('Ethereum Mainnet', 1, 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID', 'https://etherscan.io', 0),
('Ethereum Goerli', 5, 'https://goerli.infura.io/v3/YOUR_PROJECT_ID', 'https://goerli.etherscan.io', 1),
('Ethereum Sepolia', 11155111, 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID', 'https://sepolia.etherscan.io', 1),
('Polygon Mainnet', 137, 'https://polygon-rpc.com', 'https://polygonscan.com', 0),
('Polygon Mumbai', 80001, 'https://rpc-mumbai.maticvigil.com', 'https://mumbai.polygonscan.com', 1),
('BSC Mainnet', 56, 'https://bsc-dataseed.binance.org', 'https://bscscan.com', 0),
('BSC Testnet', 97, 'https://data-seed-prebsc-1-s1.binance.org:8545', 'https://testnet.bscscan.com', 1),
('Arbitrum One', 42161, 'https://arb1.arbitrum.io/rpc', 'https://arbiscan.io', 0),
('Arbitrum Goerli', 421613, 'https://goerli-rollup.arbitrum.io/rpc', 'https://goerli.arbiscan.io', 1),
('Optimism', 10, 'https://mainnet.optimism.io', 'https://optimistic.etherscan.io', 0),
('Optimism Goerli', 420, 'https://goerli.optimism.io', 'https://goerli-optimism.etherscan.io', 1);

-- 更新账户表，将network字段改为引用网络名称
-- 注意：这个操作需要谨慎，建议在测试环境先验证
-- ALTER TABLE `eth_accounts` MODIFY COLUMN `network` varchar(100) NOT NULL COMMENT '网络名称，对应eth_networks表的name字段';
