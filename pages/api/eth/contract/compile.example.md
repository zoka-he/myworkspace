# Solidity 编译 API 使用示例

## 功能说明

使用 solc-js 编译 Solidity 智能合约，生成 ABI 和 Bytecode。

## API 端点

```
POST /api/eth/contract/compile
```

## 请求示例

### 基础示例

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
console.log(result);
```

### 带优化选项的示例

```javascript
const response = await fetch('/api/eth/contract/compile', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    sourceCode: `
      pragma solidity ^0.8.0;
      
      contract Counter {
          uint256 public count;
          
          constructor() {
              count = 0;
          }
          
          function increment() public {
              count += 1;
          }
          
          function decrement() public {
              require(count > 0, "Counter: cannot decrement below zero");
              count -= 1;
          }
      }
    `,
    contractName: 'Counter',
    evmVersion: 'london',  // 可选：指定EVM版本
    optimize: true         // 可选：启用优化（默认为true）
  })
});

const result = await response.json();
```

## 响应格式

### 成功响应

```json
{
  "success": true,
  "contractName": "SimpleStorage",
  "abi": [
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "newValue",
          "type": "uint256"
        }
      ],
      "name": "set",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "get",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ],
  "bytecode": "0x608060405234801561001057600080fd5b50...",
  "deployedBytecode": "0x608060405234801561001057600080fd5b50...",
  "metadata": {
    "compiler": {
      "version": "0.8.x"
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

### 编译错误响应

```json
{
  "success": false,
  "error": "Compilation failed",
  "errors": [
    {
      "message": "ParserError: Expected ';' but got 'identifier'",
      "formattedMessage": "ParserError: Expected ';' but got 'identifier'\n --> contract.sol:4:5:\n  |\n4 |     uint256 value\n  |     ^^^^^^^^^^^^^",
      "severity": "error",
      "type": "ParserError"
    }
  ],
  "warnings": []
}
```

### 合约未找到响应

```json
{
  "success": false,
  "error": "Contract 'WrongName' not found in compiled output",
  "availableContracts": ["SimpleStorage", "Counter"],
  "message": "Please use one of the available contract names: SimpleStorage, Counter"
}
```

## 请求参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sourceCode | string | 是 | Solidity 源代码 |
| contractName | string | 是 | 要编译的合约名称 |
| evmVersion | string | 否 | EVM版本，默认为 'london'。可选值：'homestead', 'tangerineWhistle', 'spuriousDragon', 'byzantium', 'constantinople', 'petersburg', 'istanbul', 'berlin', 'london' |
| optimize | boolean | 否 | 是否启用优化，默认为 true |

## 使用示例（完整流程）

```typescript
import { useState } from 'react';

function CompileContract() {
  const [sourceCode, setSourceCode] = useState('');
  const [contractName, setContractName] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCompile = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/eth/contract/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceCode,
          contractName,
          optimize: true,
          evmVersion: 'london'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        console.log('ABI:', data.abi);
        console.log('Bytecode:', data.bytecode);
        
        // 可以将 ABI 和 Bytecode 用于部署
        // 例如：使用 ethers.js
        // const factory = new ethers.ContractFactory(data.abi, data.bytecode, signer);
        // const contract = await factory.deploy();
      } else {
        console.error('Compilation failed:', data.errors);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <textarea
        value={sourceCode}
        onChange={(e) => setSourceCode(e.target.value)}
        placeholder="Paste your Solidity code here"
      />
      <input
        value={contractName}
        onChange={(e) => setContractName(e.target.value)}
        placeholder="Contract name"
      />
      <button onClick={handleCompile} disabled={loading}>
        {loading ? 'Compiling...' : 'Compile'}
      </button>
      
      {result && (
        <div>
          <h3>Compilation Result</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

## 常见问题

### 1. 多个合约在同一文件中

如果源代码中包含多个合约，你需要指定要编译的合约名称。如果名称错误，API 会返回可用的合约列表。

```solidity
pragma solidity ^0.8.0;

contract Base {
    uint256 public value;
}

contract Derived is Base {
    function setValue(uint256 newValue) public {
        value = newValue;
    }
}
```

编译时需要指定 `contractName: 'Derived'` 或 `contractName: 'Base'`。

### 2. 导入外部库

当前版本不支持导入外部库（如 OpenZeppelin）。如果需要使用外部库：

**方案1**: 将库代码内联到同一文件中
**方案2**: 使用 Hardhat 或 Truffle 进行本地编译
**方案3**: 使用 Remix IDE 进行在线编译

### 3. 编译器版本

solc-js 包含特定版本的编译器。如果需要不同版本：
- 检查 package.json 中的 solc-js 版本
- 确保 Solidity 代码的 pragma 版本与编译器兼容

### 4. 优化配置

默认启用优化（200次运行）。这是推荐的设置，可以：
- 减少 gas 消耗
- 减小合约大小
- 提高执行效率

可以通过 `optimize: false` 关闭优化，这在调试时可能有用。

## 错误处理

```javascript
async function compileWithErrorHandling(sourceCode, contractName) {
  try {
    const response = await fetch('/api/eth/contract/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceCode, contractName })
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 400) {
        // 编译错误或参数错误
        console.error('Compilation errors:', data.errors);
        console.warn('Warnings:', data.warnings);
      } else if (response.status === 500) {
        // 服务器错误
        console.error('Server error:', data.message);
      }
      throw new Error(data.error);
    }

    // 检查警告
    if (data.warnings && data.warnings.length > 0) {
      console.warn('Compilation warnings:', data.warnings);
    }

    return {
      abi: data.abi,
      bytecode: data.bytecode,
      deployedBytecode: data.deployedBytecode
    };

  } catch (error) {
    console.error('Failed to compile contract:', error);
    throw error;
  }
}
```

## 性能建议

1. **缓存编译结果**: 对于相同的源代码，可以缓存编译结果避免重复编译
2. **前端校验**: 在发送请求前，先检查必填字段是否完整
3. **异步处理**: 编译可能需要几秒钟，使用异步处理并显示加载状态
4. **错误反馈**: 详细显示编译错误信息，帮助用户修复代码

## 与前端集成

如果你使用的是 contractDeploy 组件，编译功能已经集成在其中。只需：

1. 输入或粘贴 Solidity 代码
2. 点击"编译"按钮
3. 系统会自动调用此 API
4. 编译成功后，ABI 和 Bytecode 会自动填充到表单中
5. 然后就可以部署合约了

详见 `src/business/eth/contractDeploy/index.tsx` 组件。



