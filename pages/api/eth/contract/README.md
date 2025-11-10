# Solidity 合约编译 API

## 概述

使用官方 `solc` (v0.8.30) 包实现的 Solidity 智能合约编译服务，可以将 Solidity 源代码编译为 ABI 和 Bytecode。

## 已实现功能

✅ **编译单文件合约** - 支持编译单个 .sol 文件中的合约  
✅ **生成 ABI** - 自动生成合约的 Application Binary Interface  
✅ **生成 Bytecode** - 生成部署所需的字节码  
✅ **优化选项** - 支持编译器优化（默认启用，200次运行）  
✅ **EVM 版本控制** - 支持选择目标 EVM 版本（默认 london）  
✅ **错误处理** - 详细的编译错误和警告信息  
✅ **多合约支持** - 自动检测并列出文件中的所有合约  

## API 端点

```
POST /api/eth/contract/compile
```

## 快速开始

### 基本用法

```javascript
const response = await fetch('/api/eth/contract/compile', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    sourceCode: `
      pragma solidity ^0.8.0;
      
      contract SimpleStorage {
          uint256 private value;
          
          function set(uint256 newValue) public {
              value = newValue;
          }
          
          function get() public view returns (uint256) {
              return value;
          }
      }
    `,
    contractName: 'SimpleStorage'
  })
});

const result = await response.json();
if (result.success) {
  console.log('ABI:', result.abi);
  console.log('Bytecode:', result.bytecode);
}
```

## 请求参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| sourceCode | string | ✅ | - | Solidity 源代码 |
| contractName | string | ✅ | - | 要编译的合约名称 |
| evmVersion | string | ❌ | 'london' | EVM 版本 |
| optimize | boolean | ❌ | true | 是否启用优化 |

## 响应格式

### 成功响应

```json
{
  "success": true,
  "contractName": "SimpleStorage",
  "abi": [...],
  "bytecode": "0x...",
  "deployedBytecode": "0x...",
  "metadata": {
    "compiler": {
      "version": "0.8.30+commit.73712a01.Emscripten.clang"
    },
    "settings": {
      "optimizer": {
        "enabled": true,
        "runs": 200
      },
      "evmVersion": "london"
    }
  },
  "warnings": []
}
```

### 错误响应

```json
{
  "success": false,
  "error": "Compilation failed",
  "errors": [
    {
      "message": "ParserError: Expected ';' but got 'identifier'",
      "formattedMessage": "...",
      "severity": "error",
      "type": "ParserError"
    }
  ],
  "warnings": []
}
```

## 技术细节

- **编译器**: solc v0.8.30
- **优化**: 默认启用，200 次运行
- **EVM 版本**: 默认 london
- **输出**: ABI, Bytecode, DeployedBytecode, Metadata

## 限制

⚠️ **当前不支持以下功能**：

1. **外部库导入** - 不支持 `import` 语句（如 OpenZeppelin）
2. **多文件项目** - 仅支持单个 .sol 文件
3. **版本切换** - 固定使用 solc v0.8.30

### 解决方案

对于需要以上功能的复杂项目，建议：
- 使用 [Remix IDE](https://remix.ethereum.org) 在线编译
- 使用 [Hardhat](https://hardhat.org) 本地编译
- 使用 [Truffle](https://trufflesuite.com) 本地编译

## 与前端集成

如果你使用 `contractDeploy` 组件（位于 `src/business/eth/contractDeploy/`），编译功能已经集成。只需：

1. 输入或粘贴 Solidity 代码
2. 点击"编译"按钮
3. 系统自动调用此 API
4. 编译成功后自动填充 ABI 和 Bytecode
5. 即可部署合约

## 测试

编译器已通过测试验证：
- ✅ SimpleStorage 合约编译成功
- ✅ 生成正确的 ABI（2个函数：get, set）
- ✅ 生成有效的 Bytecode（402字节）
- ✅ 警告信息正常显示

## 文件

- `compile.ts` - 编译 API 实现
- `compile.example.md` - 详细使用示例和文档
- `README.md` - 本文档

## 依赖

```json
{
  "solc": "^0.8.30"
}
```

## 更新日志

- **2024-11-08**: 初始实现，使用 solc v0.8.30



