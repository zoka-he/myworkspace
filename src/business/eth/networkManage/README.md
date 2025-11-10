# ETH网络配置管理模块

## 功能特性

- ✅ ETH网络的增删改查
- ✅ 支持主网和测试网配置
- ✅ RPC节点和浏览器URL管理
- ✅ 链ID唯一性验证
- ✅ 网络状态监控
- ✅ 数据统计展示
- ✅ 响应式设计

## 页面访问

访问路径：`/eth/network`

## 数据库表结构

### eth_networks 表
- `id`: 主键
- `name`: 网络名称
- `chain_id`: 链ID（唯一）
- `rpc_url`: RPC节点URL
- `explorer_url`: 区块链浏览器URL
- `is_testnet`: 是否为测试网
- `create_time`: 创建时间
- `update_time`: 更新时间

## API接口

### GET /api/eth/network
获取网络列表
- 支持分页：`page`, `limit`
- 支持筛选：`name`, `chainId`, `isTestnet`

### POST /api/eth/network
创建新网络
- 必填字段：`name`, `chainId`, `rpcUrl`, `explorerUrl`
- 可选字段：`isTestnet`

### PUT /api/eth/network
更新网络信息
- 必填字段：`id`
- 可选字段：`name`, `chainId`, `rpcUrl`, `explorerUrl`, `isTestnet`

### DELETE /api/eth/network
删除网络
- 必填字段：`id`
- 注意：如果有账户使用此网络，将无法删除

## 使用说明

1. **新增网络**：点击"新增网络"按钮，填写网络信息
2. **编辑网络**：点击表格中的"编辑"按钮
3. **查看详情**：点击表格中的"查看"按钮
4. **删除网络**：点击表格中的"删除"按钮（需确认）
5. **搜索筛选**：使用顶部搜索栏进行筛选

## 预置网络配置

系统预置了以下常用网络：

### 主网
- **Ethereum Mainnet** (链ID: 1)
- **Polygon Mainnet** (链ID: 137)
- **BSC Mainnet** (链ID: 56)
- **Arbitrum One** (链ID: 42161)
- **Optimism** (链ID: 10)

### 测试网
- **Ethereum Goerli** (链ID: 5)
- **Ethereum Sepolia** (链ID: 11155111)
- **Polygon Mumbai** (链ID: 80001)
- **BSC Testnet** (链ID: 97)
- **Arbitrum Goerli** (链ID: 421613)
- **Optimism Goerli** (链ID: 420)

## 字段说明

### 网络名称 (name)
- 用于标识网络，建议使用简洁明了的名称
- 例如：Ethereum Mainnet、Polygon Mumbai

### 链ID (chainId)
- 区块链的唯一标识符
- 必须是正整数
- 系统会验证链ID的唯一性

### RPC URL (rpcUrl)
- 区块链节点的RPC接口地址
- 必须是有效的HTTP/HTTPS URL
- 建议使用可靠的RPC服务提供商

### 浏览器URL (explorerUrl)
- 区块链浏览器的地址
- 用于查看交易和地址详情
- 例如：https://etherscan.io

### 测试网标识 (isTestnet)
- 标识网络类型
- true: 测试网
- false: 主网

## 安全注意事项

- RPC URL应使用HTTPS协议
- 建议使用可靠的RPC服务提供商
- 定期检查网络连接状态
- 生产环境请使用官方推荐的RPC节点

## 扩展功能

- 网络连接状态实时监控
- 自定义网络配置导入/导出
- 网络性能指标统计
- 多链钱包集成支持

## 故障排除

### 常见问题

1. **链ID已存在**
   - 检查是否已添加相同链ID的网络
   - 链ID必须是唯一的

2. **URL格式无效**
   - 确保URL包含协议（http://或https://）
   - 检查URL是否可访问

3. **无法删除网络**
   - 检查是否有账户正在使用此网络
   - 需要先删除相关账户或更改其网络配置

### 数据库初始化

运行以下SQL脚本初始化数据库：

```sql
-- 执行 src/services/eth/ethNetwork_init.sql
```

## 技术栈

- **前端**: React + TypeScript + Ant Design
- **后端**: Next.js API Routes
- **数据库**: MySQL
- **样式**: SCSS Modules
