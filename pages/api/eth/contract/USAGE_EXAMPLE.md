# 编译 API 使用示例

## 1. 简单的合约示例

### Solidity 代码

```solidity
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
```

### 调用代码

```typescript
const response = await fetch('/api/eth/contract/compile', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    sourceCode: `pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private value;
    
    function set(uint256 newValue) public {
        value = newValue;
    }
    
    function get() public view returns (uint256) {
        return value;
    }
}`,
    contractName: 'SimpleStorage'
  })
});

const result = await response.json();
console.log(result);
```

### 预期输出

```json
{
  "success": true,
  "contractName": "SimpleStorage",
  "abi": [
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
    },
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
    }
  ],
  "bytecode": "0x6080604052...",
  "deployedBytecode": "0x6080604052...",
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

## 2. 带构造函数的合约

### Solidity 代码

```solidity
pragma solidity ^0.8.0;

contract Counter {
    uint256 public count;
    address public owner;
    
    constructor(uint256 initialCount) {
        count = initialCount;
        owner = msg.sender;
    }
    
    function increment() public {
        count += 1;
    }
    
    function decrement() public {
        require(count > 0, "Counter: cannot decrement below zero");
        count -= 1;
    }
}
```

### 调用代码

```typescript
const response = await fetch('/api/eth/contract/compile', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    sourceCode: `pragma solidity ^0.8.0;

contract Counter {
    uint256 public count;
    address public owner;
    
    constructor(uint256 initialCount) {
        count = initialCount;
        owner = msg.sender;
    }
    
    function increment() public {
        count += 1;
    }
    
    function decrement() public {
        require(count > 0, "Counter: cannot decrement below zero");
        count -= 1;
    }
}`,
    contractName: 'Counter',
    optimize: true,
    evmVersion: 'london'
  })
});

const result = await response.json();
// ABI 中会包含 constructor
console.log(result.abi.find(item => item.type === 'constructor'));
```

## 3. React 组件中使用

```tsx
import React, { useState } from 'react';
import { message } from 'antd';

interface CompileResult {
  success: boolean;
  contractName?: string;
  abi?: any[];
  bytecode?: string;
  deployedBytecode?: string;
  error?: string;
  errors?: any[];
  warnings?: any[];
}

export const CompilerComponent: React.FC = () => {
  const [sourceCode, setSourceCode] = useState('');
  const [contractName, setContractName] = useState('');
  const [compiling, setCompiling] = useState(false);
  const [result, setResult] = useState<CompileResult | null>(null);

  const handleCompile = async () => {
    if (!sourceCode || !contractName) {
      message.error('请输入源代码和合约名称');
      return;
    }

    setCompiling(true);
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
      setResult(data);

      if (data.success) {
        message.success('编译成功！');
        
        // 显示警告信息
        if (data.warnings && data.warnings.length > 0) {
          data.warnings.forEach((warning: any) => {
            message.warning(warning.message);
          });
        }
      } else {
        message.error('编译失败');
        
        // 显示错误信息
        if (data.errors && data.errors.length > 0) {
          data.errors.forEach((error: any) => {
            console.error(error.formattedMessage);
          });
        }
      }
    } catch (error) {
      console.error('编译错误:', error);
      message.error('编译过程中发生错误');
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div>
      <h2>Solidity 编译器</h2>
      
      <div>
        <label>合约名称:</label>
        <input
          type="text"
          value={contractName}
          onChange={(e) => setContractName(e.target.value)}
          placeholder="例如: SimpleStorage"
        />
      </div>

      <div>
        <label>源代码:</label>
        <textarea
          value={sourceCode}
          onChange={(e) => setSourceCode(e.target.value)}
          placeholder="粘贴你的 Solidity 代码..."
          rows={20}
          style={{ width: '100%', fontFamily: 'monospace' }}
        />
      </div>

      <button 
        onClick={handleCompile}
        disabled={compiling}
      >
        {compiling ? '编译中...' : '编译'}
      </button>

      {result && result.success && (
        <div style={{ marginTop: '20px' }}>
          <h3>编译结果</h3>
          
          <div>
            <h4>ABI</h4>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '10px', 
              overflow: 'auto' 
            }}>
              {JSON.stringify(result.abi, null, 2)}
            </pre>
          </div>

          <div>
            <h4>Bytecode</h4>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '10px', 
              overflow: 'auto',
              wordBreak: 'break-all'
            }}>
              {result.bytecode}
            </pre>
          </div>

          <div>
            <h4>编译器信息</h4>
            <p>版本: {result.metadata?.compiler?.version}</p>
            <p>优化: {result.metadata?.settings?.optimizer?.enabled ? '已启用' : '已禁用'}</p>
            <p>EVM版本: {result.metadata?.settings?.evmVersion}</p>
          </div>
        </div>
      )}

      {result && !result.success && (
        <div style={{ marginTop: '20px', color: 'red' }}>
          <h3>编译错误</h3>
          {result.errors?.map((error, index) => (
            <pre key={index} style={{ 
              background: '#fff0f0', 
              padding: '10px',
              border: '1px solid #ffcccc'
            }}>
              {error.formattedMessage}
            </pre>
          ))}
        </div>
      )}
    </div>
  );
};
```

## 4. 与 ethers.js 集成部署

```typescript
import { ethers } from 'ethers';

async function compileAndDeploy(sourceCode: string, contractName: string) {
  // 1. 编译合约
  const compileResponse = await fetch('/api/eth/contract/compile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceCode,
      contractName
    })
  });

  const compileResult = await compileResponse.json();

  if (!compileResult.success) {
    throw new Error('Compilation failed: ' + JSON.stringify(compileResult.errors));
  }

  // 2. 连接钱包
  if (!window.ethereum) {
    throw new Error('请安装 MetaMask');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();

  // 3. 创建合约工厂
  const factory = new ethers.ContractFactory(
    compileResult.abi,
    compileResult.bytecode,
    signer
  );

  // 4. 部署合约（如果有构造函数参数，在这里传入）
  console.log('开始部署合约...');
  const contract = await factory.deploy(/* 构造函数参数 */);
  
  // 5. 等待部署完成
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log('合约部署成功！地址:', contractAddress);

  return {
    address: contractAddress,
    contract,
    abi: compileResult.abi
  };
}

// 使用示例
const sourceCode = `
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
`;

compileAndDeploy(sourceCode, 'SimpleStorage')
  .then(result => {
    console.log('部署成功:', result.address);
  })
  .catch(error => {
    console.error('部署失败:', error);
  });
```

## 5. 命令行测试（使用 curl）

### 成功的编译

```bash
curl -X POST http://localhost:3000/api/eth/contract/compile \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCode": "pragma solidity ^0.8.0; contract Test { uint256 public value; function setValue(uint256 v) public { value = v; } }",
    "contractName": "Test"
  }'
```

### 带优化选项

```bash
curl -X POST http://localhost:3000/api/eth/contract/compile \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCode": "pragma solidity ^0.8.0; contract Test { uint256 public value; }",
    "contractName": "Test",
    "optimize": true,
    "evmVersion": "london"
  }'
```

## 6. 错误处理示例

```typescript
async function compileWithErrorHandling(sourceCode: string, contractName: string) {
  try {
    const response = await fetch('/api/eth/contract/compile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceCode,
        contractName
      })
    });

    const result = await response.json();

    if (!result.success) {
      // 处理编译错误
      if (result.errors) {
        console.error('编译错误:');
        result.errors.forEach((error: any) => {
          console.error(`  [${error.type}] ${error.message}`);
          console.error(error.formattedMessage);
        });
      }

      // 处理合约未找到错误
      if (result.availableContracts) {
        console.error(`合约 '${contractName}' 未找到`);
        console.error('可用的合约:', result.availableContracts.join(', '));
      }

      throw new Error(result.error);
    }

    // 显示警告（如果有）
    if (result.warnings && result.warnings.length > 0) {
      console.warn('编译警告:');
      result.warnings.forEach((warning: any) => {
        console.warn(`  ${warning.message}`);
      });
    }

    return {
      abi: result.abi,
      bytecode: result.bytecode,
      deployedBytecode: result.deployedBytecode
    };

  } catch (error) {
    console.error('编译失败:', error);
    throw error;
  }
}
```

## 常见错误及解决方案

### 1. 缺少 SPDX 许可证标识符

**警告信息:**
```
SPDX license identifier not provided in source file
```

**解决方案:** 在文件开头添加许可证标识符
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MyContract {
    // ...
}
```

### 2. Pragma 版本不匹配

**错误信息:**
```
Source file requires different compiler version
```

**解决方案:** 确保 pragma 声明与编译器版本兼容
```solidity
pragma solidity ^0.8.0;  // 兼容 0.8.x
// 或
pragma solidity >=0.8.0 <0.9.0;  // 指定范围
```

### 3. 合约名称错误

**错误信息:**
```
Contract 'WrongName' not found in compiled output
```

**解决方案:** 检查合约名称是否正确，区分大小写
```typescript
// 源代码中的合约名
contract SimpleStorage { ... }

// 请求中的 contractName 必须匹配
{ contractName: 'SimpleStorage' }  // ✅ 正确
{ contractName: 'simpleStorage' }  // ❌ 错误
```

## 最佳实践

1. **始终检查编译结果** - 即使成功也要检查警告信息
2. **缓存编译结果** - 对于相同的源代码，缓存 ABI 和 Bytecode
3. **异步处理** - 编译可能需要几秒钟，使用加载状态
4. **错误反馈** - 向用户显示友好的错误信息
5. **版本兼容性** - 确保 Solidity 代码与编译器版本兼容
6. **测试先行** - 在部署前在测试网络上测试合约



