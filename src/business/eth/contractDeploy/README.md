# ETH智能合约部署管理系统

## 功能概述

这是一个专业的以太坊智能合约部署和管理界面，提供以下核心功能：

### 1. 合约部署
- **Sol文件上传**: 支持直接上传.sol文件
- **代码编写**: 可以直接在界面中编写Solidity代码
- **自动编译**: 尝试使用后端API自动编译合约
- **手动输入**: 支持手动输入ABI和Bytecode（适用于已在Remix等工具中编译的合约）
- **账户选择**: 从ETH账户管理中选择部署账户
- **构造函数参数**: 自动解析并提供构造函数参数输入

### 2. 合约管理
- **合约列表**: 展示所有已部署的合约
- **搜索过滤**: 按合约名称、地址、网络、状态筛选
- **状态追踪**: 实时显示合约部署状态
- **批量管理**: 支持批量查询和管理

### 3. 合约详情
- **基本信息**: 查看合约地址、部署账户、网络等信息
- **方法列表**: 展示所有合约方法及其参数
- **事件列表**: 查看合约定义的所有事件
- **源代码**: 查看原始Solidity源代码
- **ABI查看**: 查看完整的合约ABI

### 4. 合约交互
- **方法调用**: 支持调用合约的任何公开方法
- **只读方法**: view/pure方法无需Gas，直接返回结果
- **交易方法**: 自动处理需要Gas的方法调用
- **账户选择**: 为交易方法选择签名账户

## 使用流程

### 方式一：使用代码编译

1. 点击"部署合约"按钮
2. 在"编写代码"标签页中：
   - 上传.sol文件，或
   - 直接粘贴Solidity代码
3. 点击"编译合约"按钮
4. 切换到"部署配置"标签页：
   - 选择部署账户
   - 填写构造函数参数（如果有）
   - 添加备注信息
5. 点击"部署合约"按钮
6. 等待部署完成

### 方式二：使用手动输入（推荐）

1. 在Remix IDE中编译你的合约：
   - 访问 https://remix.ethereum.org
   - 粘贴你的Solidity代码
   - 点击编译
   - 复制编译结果中的ABI和Bytecode

2. 在本系统中：
   - 点击"部署合约"按钮
   - 切换到"手动输入"标签页
   - 输入合约名称
   - 粘贴ABI（JSON格式）
   - 粘贴Bytecode（以0x开头）
   - 点击"确认编译信息"

3. 切换到"部署配置"标签页，完成部署

### 合约交互

1. 在合约列表中找到目标合约
2. 点击"交互"按钮
3. 选择要调用的方法
4. 填写方法参数
5. 如果是交易方法，选择签名账户
6. 点击"调用"按钮
7. 查看结果

## 示例合约

查看 `SimpleStorage.sol` 了解一个简单的示例合约。

## 数据库表结构

系统需要以下数据库表（请确保后端API已实现）：

```sql
CREATE TABLE eth_contract (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(42) NOT NULL,
    deployer_address VARCHAR(42) NOT NULL,
    deployer_account_id INT NOT NULL,
    network_id INT NOT NULL,
    network VARCHAR(50) NOT NULL,
    chain_id INT NOT NULL,
    abi TEXT NOT NULL,
    bytecode TEXT NOT NULL,
    source_code TEXT,
    constructor_params TEXT,
    status ENUM('deployed', 'pending', 'failed') DEFAULT 'deployed',
    remark TEXT,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_address (address),
    INDEX idx_network (network),
    INDEX idx_deployer (deployer_account_id)
);
```

## 后端API接口

系统需要以下后端API接口：

### 1. 合约列表查询
```
GET /api/eth/contract
Query: { page, limit, name?, address?, network?, status? }
Response: { data: IContract[], count: number }
```

### 2. 创建合约记录
```
POST /api/eth/contract
Body: IContract
Response: { success: boolean, data: IContract }
```

### 3. 删除合约
```
DELETE /api/eth/contract
Query: { id: number }
Response: { success: boolean }
```

### 4. 编译合约（可选）
```
POST /api/eth/contract/compile
Body: { sourceCode: string, contractName: string }
Response: { success: boolean, abi: any[], bytecode: string, error?: string }
```

### 5. 获取账户列表
```
GET /api/eth/account
Query: { page, limit, name?, address?, network? }
Response: { data: IEthAccount[], count: number }
```

### 6. 获取网络信息
```
GET /api/eth/network
Query: { id?: number }
Response: { data: IEthNetwork[] }
```

## 安全注意事项

1. **私钥管理**: 
   - 私钥应该加密存储在数据库中
   - 前端不应该长期缓存私钥
   - 建议使用环境变量或密钥管理服务

2. **网络选择**:
   - 建议先在测试网（Sepolia, Goerli）上测试
   - 确认无误后再部署到主网

3. **Gas费用**:
   - 部署前确保账户有足够的ETH支付Gas
   - 复杂合约可能需要较高的Gas limit

4. **合约验证**:
   - 部署后建议在区块链浏览器上验证合约
   - 保存好源代码和ABI

## 技术栈

- **前端框架**: React + TypeScript
- **UI组件库**: Ant Design
- **区块链库**: ethers.js v6
- **样式方案**: SCSS Modules
- **状态管理**: React Hooks

## 支持的网络

- Ethereum Mainnet
- Sepolia Testnet
- Goerli Testnet
- 其他EVM兼容链（需在网络管理中配置）

## 故障排查

### 编译失败
1. 检查Solidity语法是否正确
2. 尝试使用"手动输入"方式
3. 在Remix中先验证代码

### 部署失败
1. 检查账户余额是否充足
2. 确认网络连接正常
3. 检查RPC节点是否可用
4. 验证构造函数参数是否正确

### 交互失败
1. 确认方法参数类型正确
2. 检查账户权限
3. 查看合约是否有访问控制

## 未来计划

- [ ] 支持多文件合约编译
- [ ] 集成合约验证功能
- [ ] 添加合约模板库
- [ ] 支持合约升级管理
- [ ] 添加交易历史记录
- [ ] 支持批量合约部署
- [ ] 集成测试框架
- [ ] 添加Gas估算功能

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT

