# NFT铸造管理系统

## 功能概述

这是一个基于以太坊的NFT铸造和管理界面，支持ERC-721标准的NFT合约。主要功能包括：

- 🎨 **铸造NFT**: 向已部署的NFT合约铸造新的NFT
- 📊 **NFT管理**: 查看、搜索和管理已铸造的NFT
- 🔍 **详细信息**: 查看NFT的完整元数据、属性和交易信息
- 🌐 **多网络支持**: 支持多个以太坊网络（主网、测试网等）
- 💼 **账户管理**: 使用已配置的账户进行NFT铸造

## 使用步骤

### 1. 准备工作

在使用NFT铸造功能之前，请确保：

1. **部署NFT合约**: 在"合约部署"页面部署一个ERC-721标准的NFT合约
2. **配置账户**: 在"账户管理"页面添加至少一个有私钥的账户，并确保有足够的余额支付gas费用
3. **配置网络**: 确保已配置正确的网络RPC URL

### 2. 铸造NFT

1. 点击"铸造NFT"按钮
2. 填写以下信息：

#### 基本信息标签页
- **NFT合约**: 选择已部署的NFT合约
- **铸造账户**: 选择用于支付gas费用的账户（需要有私钥）
- **接收地址**: NFT将被铸造到此地址（可以是任何有效的以太坊地址）
- **Token ID**: 
  - 自动模式：系统会自动获取下一个可用的Token ID
  - 手动模式：您可以手动指定Token ID

#### 元数据标签页
- **NFT名称**: NFT的名称
- **描述**: NFT的详细描述
- **图片URL**: NFT图片的URL（支持IPFS或HTTP链接）
- **元数据URI**（可选）: 如果合约支持，可以指定元数据URI
- **属性**（可选）: JSON格式的NFT属性，例如：
  ```json
  [
    {"trait_type": "Background", "value": "Blue"},
    {"trait_type": "Rarity", "value": "Rare"}
  ]
  ```

#### 使用完整JSON元数据
您也可以直接粘贴完整的元数据JSON：
```json
{
  "name": "My NFT",
  "description": "This is my NFT",
  "image": "ipfs://QmXxx...",
  "attributes": [
    {"trait_type": "Background", "value": "Blue"},
    {"trait_type": "Rarity", "value": "Rare"}
  ]
}
```

3. 点击"铸造NFT"按钮，等待交易确认

### 3. 查看和管理NFT

- **搜索**: 使用查询栏搜索NFT（按名称、Token ID、合约地址、持有者地址等）
- **查看详情**: 点击"详情"按钮查看NFT的完整信息，包括图片、元数据和属性
- **复制信息**: 点击"复制"按钮复制合约地址和Token ID
- **删除记录**: 点击"删除"按钮删除NFT记录（注意：这只会删除本地记录，不会销毁链上的NFT）

## 支持的合约方法

系统会自动检测合约支持的mint方法，并按以下优先级调用：

1. `mintWithURI(address to, uint256 tokenId, string memory uri)` - 如果提供了元数据URI
2. `safeMint(address to, uint256 tokenId)` - 推荐使用的安全铸造方法
3. `mint(address to, uint256 tokenId)` - 基本的铸造方法

确保您的NFT合约实现了至少一个上述方法。

## NFT合约示例

### 基础ERC-721合约（使用OpenZeppelin）

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721, Ownable {
    uint256 private _tokenIdCounter;

    constructor() ERC721("MyNFT", "MNFT") Ownable(msg.sender) {}

    function safeMint(address to, uint256 tokenId) public onlyOwner {
        _safeMint(to, tokenId);
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }
}
```

### 带元数据URI的ERC-721合约

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFTWithURI is ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;

    constructor() ERC721("MyNFTWithURI", "MNFTURI") Ownable(msg.sender) {}

    function mintWithURI(address to, uint256 tokenId, string memory uri) 
        public 
        onlyOwner 
    {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _tokenIdCounter++;
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }
}
```

## 数据库表结构

### nft表
存储NFT的基本信息和元数据。

主要字段：
- `contract_address`: NFT合约地址
- `token_id`: Token ID
- `owner_address`: 当前所有者地址
- `minter_address`: 铸造者地址
- `name`, `description`, `image_url`: NFT元数据
- `attributes`: NFT属性（JSON格式）
- `transaction_hash`: 铸造交易哈希
- `status`: 状态（pending/minted/failed）

### nft_transfer_history表（可选）
追踪NFT的转移历史记录。

## 技术栈

- **前端**: React, TypeScript, Ant Design
- **区块链交互**: ethers.js v6
- **后端API**: Next.js API Routes
- **数据库**: MySQL

## 注意事项

1. **Gas费用**: 铸造NFT需要支付gas费用，请确保铸造账户有足够的余额
2. **Token ID唯一性**: 每个Token ID在同一合约中必须是唯一的
3. **元数据存储**: 
   - 图片和元数据可以存储在IPFS、Arweave等去中心化存储
   - 也可以使用中心化的HTTP服务器
4. **合约权限**: 确保铸造账户有权调用合约的mint方法（通常需要是owner）
5. **网络选择**: 
   - 测试阶段建议使用测试网（如Sepolia、Goerli）
   - 测试网的代币可以从水龙头免费获取

## 最佳实践

1. **使用IPFS存储**: 将NFT图片和元数据上传到IPFS，使用IPFS URI作为元数据URI
2. **标准化元数据**: 遵循OpenSea等市场的元数据标准
3. **测试先行**: 在测试网上充分测试后再部署到主网
4. **备份私钥**: 妥善保管账户私钥
5. **合理的属性**: 为NFT添加有意义的属性，提高可玩性和价值

## 元数据标准

推荐遵循OpenSea的元数据标准：

```json
{
  "name": "NFT名称",
  "description": "NFT描述",
  "image": "ipfs://QmXxx...",
  "external_url": "https://mywebsite.com/nft/1",
  "attributes": [
    {
      "trait_type": "属性类型",
      "value": "属性值"
    }
  ]
}
```

## 故障排查

### 铸造失败
- 检查账户余额是否足够
- 确认账户有权限调用mint方法
- 检查Token ID是否已存在
- 查看浏览器控制台的错误信息

### 无法查看NFT
- 确认图片URL可访问
- 检查元数据格式是否正确
- 确认网络连接正常

### 交易pending很久
- 检查网络拥堵情况
- 可以尝试增加gas price
- 在区块浏览器查看交易状态

## 相关链接

- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [ERC-721 Standard](https://eips.ethereum.org/EIPS/eip-721)
- [OpenSea Metadata Standards](https://docs.opensea.io/docs/metadata-standards)
- [IPFS Documentation](https://docs.ipfs.tech/)
- [ethers.js Documentation](https://docs.ethers.org/)


