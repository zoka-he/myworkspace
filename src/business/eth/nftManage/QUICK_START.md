# NFT铸造快速开始指南

## 5分钟快速开始

### 步骤1: 准备数据库表（首次使用）

执行SQL文件创建NFT相关的数据库表：

```bash
# 找到文件 src/services/eth/nft.sql
# 在MySQL中执行该文件中的SQL语句
```

或直接执行：

```sql
-- 创建NFT表
CREATE TABLE IF NOT EXISTS `nft` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `contract_id` int(11) DEFAULT NULL,
  `contract_address` varchar(255) NOT NULL,
  `token_id` varchar(255) NOT NULL,
  `owner_address` varchar(255) NOT NULL,
  `minter_address` varchar(255) NOT NULL,
  `minter_account_id` int(11) DEFAULT NULL,
  `metadata_uri` text,
  `name` varchar(255) DEFAULT NULL,
  `description` text,
  `image_url` text,
  `attributes` text,
  `transaction_hash` varchar(255) DEFAULT NULL,
  `network_id` int(11) DEFAULT NULL,
  `network` varchar(100) DEFAULT NULL,
  `chain_id` int(11) DEFAULT NULL,
  `status` enum('pending','minted','failed') DEFAULT 'minted',
  `remark` text,
  `create_time` datetime DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_nft` (`contract_address`, `token_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 步骤2: 部署NFT合约

#### 方案A: 使用提供的合约示例

1. 选择一个合约（推荐 `NFTWithMetadata.sol`）
2. 在Remix IDE中编译：
   - 打开 https://remix.ethereum.org/
   - 复制合约代码
   - 编译器版本选择 0.8.20+
   - 点击编译
3. 在Remix中部署到测试网（Sepolia）
4. 或者导出编译结果，在本系统"合约部署"页面部署

#### 方案B: 使用已部署的测试合约

如果只是测试功能，可以使用已部署在Sepolia测试网的合约：

```
合约地址: 0x... (需要实际部署后填写)
合约ABI: 见编译结果
```

### 步骤3: 配置账户

在"账户管理"页面添加账户：

1. 点击"创建账户"或"导入账户"
2. 如果是测试，可以：
   - 创建新账户（系统会生成私钥）
   - 从测试网水龙头获取测试币：https://sepoliafaucet.com/
3. 确保账户有足够余额（约0.01 ETH用于测试）

### 步骤4: 铸造您的第一个NFT

1. 进入"NFT管理"页面
2. 点击"铸造NFT"按钮
3. 填写信息：
   ```
   NFT合约: [选择刚部署的合约]
   铸造账户: [选择有余额的账户]
   接收地址: [输入接收NFT的地址，可以使用当前账户]
   Token ID: [保持"自动"模式]
   
   元数据标签页：
   NFT名称: My First NFT
   描述: This is my first NFT on Ethereum
   图片URL: https://picsum.photos/500 (示例图片)
   ```
4. 点击"铸造NFT"
5. 等待交易确认（约15-30秒）
6. 完成！

### 步骤5: 查看NFT

在NFT列表中可以看到刚铸造的NFT：
- 点击"详情"查看完整信息
- 点击图片可以查看大图
- 可以复制合约地址和Token ID

## 常见问题

### Q: 铸造失败，提示"insufficient funds"
A: 账户余额不足，请从水龙头获取更多测试币。

### Q: 铸造失败，提示"execution reverted"
A: 可能原因：
1. 账户不是合约的owner
2. Token ID已存在
3. 合约方法不匹配

### Q: NFT图片不显示
A: 检查图片URL是否可访问，建议使用稳定的图床或IPFS。

### Q: 如何在OpenSea上看到我的NFT？
A: 
1. 确保铸造在支持的网络（如Sepolia、Mainnet）
2. 访问 OpenSea测试网: https://testnets.opensea.io/
3. 连接钱包并搜索您的合约地址
4. 主网NFT会自动显示在 https://opensea.io/

## 进阶使用

### 使用IPFS存储元数据

1. 准备元数据JSON文件：
```json
{
  "name": "Cool NFT #1",
  "description": "This is a cool NFT",
  "image": "ipfs://QmXxx.../image.png",
  "attributes": [
    {"trait_type": "Background", "value": "Blue"},
    {"trait_type": "Rarity", "value": "Rare"}
  ]
}
```

2. 上传到IPFS（使用Pinata、NFT.Storage等）

3. 获取IPFS URI: `ipfs://QmXxx.../metadata.json`

4. 在铸造时填入"元数据URI"字段

### 批量铸造

如果需要批量铸造，可以：

1. 使用合约的 `batchMint` 方法（如果支持）
2. 或使用脚本调用API多次铸造

### 添加自定义属性

在"属性"字段中输入JSON：

```json
[
  {
    "trait_type": "Strength",
    "value": 10
  },
  {
    "trait_type": "Speed",
    "value": 85
  },
  {
    "display_type": "boost_percentage",
    "trait_type": "Boost",
    "value": 10
  },
  {
    "display_type": "date",
    "trait_type": "Birthday",
    "value": 1672531200
  }
]
```

支持的display_type:
- `number`: 数字
- `boost_percentage`: 百分比加成
- `boost_number`: 数字加成
- `date`: 时间戳

## 测试网信息

### Sepolia (推荐)
- Chain ID: 11155111
- RPC URL: https://sepolia.infura.io/v3/YOUR-PROJECT-ID
- 区块浏览器: https://sepolia.etherscan.io/
- 水龙头: https://sepoliafaucet.com/

### Goerli
- Chain ID: 5
- RPC URL: https://goerli.infura.io/v3/YOUR-PROJECT-ID
- 区块浏览器: https://goerli.etherscan.io/
- 水龙头: https://goerlifaucet.com/

## 主网部署注意事项

在主网部署前：

1. ✅ 在测试网充分测试
2. ✅ 确认合约代码无误
3. ✅ 准备足够的ETH（部署约需0.05-0.2 ETH，铸造约需0.01-0.05 ETH每个）
4. ✅ 考虑进行合约审计
5. ✅ 备份所有私钥
6. ✅ 准备元数据存储方案（推荐IPFS）
7. ✅ 测试元数据链接的稳定性

## 推荐的工作流程

### 开发阶段
1. 在Sepolia测试网部署合约
2. 铸造测试NFT，验证功能
3. 迭代改进

### 准备发布
1. 准备所有NFT的图片和元数据
2. 上传到IPFS或稳定的服务器
3. 在主网部署最终版本合约
4. 进行小规模测试铸造

### 正式发布
1. 铸造NFT
2. 在OpenSea等市场验证显示
3. 开始销售或分发

## 获取帮助

- 查看完整文档：`README.md`
- 查看合约示例：`contracts/` 目录
- 查看错误日志：浏览器控制台
- 区块浏览器查看交易：Etherscan

## 下一步

- 📖 阅读完整文档了解更多功能
- 🔧 尝试不同的合约类型（带版税、可升级等）
- 🎨 使用IPFS存储元数据
- 🚀 部署到主网

祝您铸造愉快！ 🎉

