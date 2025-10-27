# ETH账户管理模块

## 功能特性

- ✅ ETH账户的增删改查
- ✅ 支持多个以太坊网络（主网、测试网等）
- ✅ 钱包地址和私钥管理
- ✅ 余额显示和管理
- ✅ 账户搜索和筛选
- ✅ 数据复制功能
- ✅ 响应式设计

## 页面访问

访问路径：`/eth/account`

## 数据库表结构

### eth_accounts 表
- `id`: 主键
- `name`: 账户名称
- `address`: 钱包地址（唯一）
- `private_key`: 私钥（加密存储）
- `balance`: 余额（ETH）
- `network`: 网络类型
- `remark`: 备注
- `create_time`: 创建时间
- `update_time`: 更新时间

### eth_transactions 表
- 交易记录管理
- 支持交易状态跟踪

### eth_networks 表
- 网络配置管理
- 支持自定义RPC节点

## API接口

### GET /api/eth/account
获取账户列表
- 支持分页：`page`, `limit`
- 支持筛选：`name`, `address`, `network`

### POST /api/eth/account
创建新账户
- 必填字段：`name`, `address`, `network`
- 可选字段：`privateKey`, `balance`, `remark`

### PUT /api/eth/account
更新账户信息
- 必填字段：`id`
- 可选字段：`name`, `address`, `privateKey`, `balance`, `network`, `remark`

### DELETE /api/eth/account
删除账户
- 必填字段：`id`

## 使用说明

1. **新增账户**：点击"新增账户"按钮，填写账户信息
2. **编辑账户**：点击表格中的"编辑"按钮
3. **查看详情**：点击表格中的"查看"按钮
4. **删除账户**：点击表格中的"删除"按钮（需确认）
5. **复制地址**：点击地址旁的复制按钮
6. **搜索筛选**：使用顶部搜索栏进行筛选

## 安全注意事项

- 私钥以加密形式存储
- 生产环境请使用HTTPS
- 建议定期备份数据库
- 私钥访问需要额外权限验证

## 扩展功能

- 交易记录管理
- 余额自动更新
- 多签钱包支持
- 硬件钱包集成
