# NFT合约示例

本目录包含几个常用的NFT合约示例，可以直接使用或作为参考。

## 合约列表

### 1. BasicNFT.sol
最基础的ERC-721 NFT合约。

**特点：**
- 简单的mint功能
- 只有owner可以铸造
- 支持自动递增和指定Token ID
- 支持批量铸造

**适用场景：**
- 简单的NFT项目
- 学习和测试
- 不需要元数据URI的场景

**主要方法：**
```solidity
function safeMint(address to) public onlyOwner
function safeMint(address to, uint256 tokenId) public onlyOwner
function batchMint(address to, uint256 amount) public onlyOwner
function totalSupply() public view returns (uint256)
```

### 2. NFTWithMetadata.sol
支持元数据URI的ERC-721 NFT合约。

**特点：**
- 为每个NFT设置独立的元数据URI
- 支持IPFS和HTTP链接
- 可设置基础URI
- 支持批量铸造
- 可更新元数据URI

**适用场景：**
- 需要链接到外部元数据的NFT项目
- 图片和属性存储在IPFS或服务器
- 需要灵活更新元数据的场景

**主要方法：**
```solidity
function setBaseURI(string memory baseURI) public onlyOwner
function safeMint(address to, string memory uri) public onlyOwner
function mintWithURI(address to, uint256 tokenId, string memory uri) public onlyOwner
function batchMint(address[] memory to, string[] memory uris) public onlyOwner
function updateTokenURI(uint256 tokenId, string memory uri) public onlyOwner
function totalSupply() public view returns (uint256)
```

### 3. NFTWithRoyalty.sol
支持版税（EIP-2981）的ERC-721 NFT合约。

**特点：**
- 实现EIP-2981版税标准
- 可设置默认版税
- 可为每个NFT设置独立版税
- 支持元数据URI

**适用场景：**
- 需要版税功能的艺术品NFT
- 在OpenSea等市场上出售的NFT
- 创作者希望从二次销售中获得收益

**主要方法：**
```solidity
function setDefaultRoyalty(address receiver, uint96 feeNumerator) public onlyOwner
function safeMint(address to, string memory uri) public onlyOwner
function mintWithCustomRoyalty(
    address to,
    uint256 tokenId,
    string memory uri,
    address royaltyReceiver,
    uint96 royaltyFraction
) public onlyOwner
function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) public onlyOwner
function totalSupply() public view returns (uint256)
function getDefaultRoyalty() public view returns (address, uint96)
```

## 如何使用

### 1. 安装依赖

这些合约使用OpenZeppelin库，首先需要安装依赖：

```bash
npm install @openzeppelin/contracts
```

### 2. 编译合约

#### 使用Hardhat

```bash
npx hardhat compile
```

#### 使用Remix

将合约代码复制到Remix IDE（https://remix.ethereum.org/），选择合适的编译器版本（0.8.20+）并编译。

### 3. 部署合约

#### 使用Hardhat部署脚本

创建 `scripts/deploy.js`:

```javascript
const hre = require("hardhat");

async function main() {
  // 部署BasicNFT
  const BasicNFT = await hre.ethers.getContractFactory("BasicNFT");
  const basicNFT = await BasicNFT.deploy();
  await basicNFT.waitForDeployment();
  console.log("BasicNFT deployed to:", await basicNFT.getAddress());

  // 部署NFTWithMetadata
  const NFTWithMetadata = await hre.ethers.getContractFactory("NFTWithMetadata");
  const nftWithMetadata = await NFTWithMetadata.deploy("MyNFT", "MNFT");
  await nftWithMetadata.waitForDeployment();
  console.log("NFTWithMetadata deployed to:", await nftWithMetadata.getAddress());

  // 部署NFTWithRoyalty
  const royaltyReceiver = "0x..."; // 版税接收地址
  const royaltyFraction = 500; // 5% (500/10000)
  const NFTWithRoyalty = await hre.ethers.getContractFactory("NFTWithRoyalty");
  const nftWithRoyalty = await NFTWithRoyalty.deploy(
    "MyRoyaltyNFT",
    "MRNFT",
    royaltyReceiver,
    royaltyFraction
  );
  await nftWithRoyalty.waitForDeployment();
  console.log("NFTWithRoyalty deployed to:", await nftWithRoyalty.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

运行部署：
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

#### 使用本系统部署

1. 在Remix或Hardhat中编译合约
2. 导出编译结果（JSON文件）
3. 在本系统的"合约部署"页面上传编译结果
4. 填写构造函数参数（如果有）
5. 选择网络和账户
6. 部署合约

### 4. 铸造NFT

部署完成后，在"NFT管理"页面：
1. 选择刚部署的合约
2. 填写NFT信息
3. 点击"铸造NFT"

## 版税说明

版税比例使用"基点"表示：
- 1基点 = 0.01%
- 100基点 = 1%
- 500基点 = 5%
- 1000基点 = 10%
- 10000基点 = 100%

例如，设置5%的版税：
```solidity
uint96 royaltyFraction = 500; // 5%
```

## 元数据URI格式

### IPFS URI
```
ipfs://QmXxx.../metadata.json
```

### HTTP URI
```
https://myapi.com/nft/1
```

### 基础URI + Token ID
如果设置了基础URI：
```solidity
setBaseURI("https://myapi.com/nft/");
```
则Token ID 1的URI将是：`https://myapi.com/nft/1`

## 元数据JSON格式

```json
{
  "name": "NFT #1",
  "description": "This is my first NFT",
  "image": "ipfs://QmXxx.../image.png",
  "external_url": "https://mywebsite.com",
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Blue"
    },
    {
      "trait_type": "Rarity",
      "value": "Rare"
    },
    {
      "display_type": "number",
      "trait_type": "Generation",
      "value": 1
    }
  ]
}
```

## Gas优化建议

1. **批量铸造**: 如果需要铸造多个NFT，使用 `batchMint` 可以节省gas
2. **提前计算Token ID**: 使用固定的Token ID模式，避免复杂的计算
3. **简化元数据**: 如果不需要频繁更新元数据，使用基础URI而不是单独存储每个URI
4. **合理的版税**: 版税比例通常在2.5%-10%之间

## 安全注意事项

1. **访问控制**: 确保只有授权地址可以mint
2. **重入攻击**: 使用 `_safeMint` 而不是 `_mint`
3. **整数溢出**: Solidity 0.8+已内置溢出检查
4. **测试**: 在测试网充分测试后再部署主网
5. **审计**: 重要项目建议进行专业的安全审计

## 测试网水龙头

### Sepolia (推荐)
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia

### Goerli
- https://goerlifaucet.com/
- https://faucet.quicknode.com/ethereum/goerli

### Mumbai (Polygon测试网)
- https://faucet.polygon.technology/

## 相关资源

- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [ERC-721 Standard](https://eips.ethereum.org/EIPS/eip-721)
- [EIP-2981 NFT Royalty Standard](https://eips.ethereum.org/EIPS/eip-2981)
- [OpenSea Metadata Standards](https://docs.opensea.io/docs/metadata-standards)
- [Hardhat Documentation](https://hardhat.org/docs)

