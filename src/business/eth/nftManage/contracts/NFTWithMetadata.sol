// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title NFTWithMetadata
 * @dev 带元数据URI的ERC-721 NFT合约
 * 特点：
 * - 支持为每个NFT设置独立的元数据URI
 * - 支持IPFS和HTTP链接
 * - 自动递增Token ID
 */
contract NFTWithMetadata is ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;
    string private _baseTokenURI;

    // 事件
    event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI);
    event BaseURIUpdated(string newBaseURI);

    constructor(string memory name, string memory symbol) 
        ERC721(name, symbol) 
        Ownable(msg.sender) 
    {}

    /**
     * @dev 设置基础URI
     * @param baseURI 基础URI，所有token URI将以此为前缀
     */
    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
        emit BaseURIUpdated(baseURI);
    }

    /**
     * @dev 获取基础URI
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev 铸造新的NFT（自动生成Token ID）
     * @param to 接收者地址
     * @param uri 元数据URI
     */
    function safeMint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit NFTMinted(to, tokenId, uri);
    }

    /**
     * @dev 铸造指定Token ID的NFT
     * @param to 接收者地址
     * @param tokenId 指定的Token ID
     * @param uri 元数据URI
     */
    function mintWithURI(address to, uint256 tokenId, string memory uri) 
        public 
        onlyOwner 
    {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        if (tokenId >= _tokenIdCounter) {
            _tokenIdCounter = tokenId + 1;
        }
        
        emit NFTMinted(to, tokenId, uri);
    }

    /**
     * @dev 批量铸造NFT
     * @param to 接收者地址数组
     * @param uris 元数据URI数组
     */
    function batchMint(address[] memory to, string[] memory uris) 
        public 
        onlyOwner 
    {
        require(to.length == uris.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < to.length; i++) {
            uint256 tokenId = _tokenIdCounter;
            _tokenIdCounter++;
            _safeMint(to[i], tokenId);
            _setTokenURI(tokenId, uris[i]);
            
            emit NFTMinted(to[i], tokenId, uris[i]);
        }
    }

    /**
     * @dev 更新已存在NFT的元数据URI
     * @param tokenId Token ID
     * @param uri 新的元数据URI
     */
    function updateTokenURI(uint256 tokenId, string memory uri) 
        public 
        onlyOwner 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        _setTokenURI(tokenId, uri);
    }

    /**
     * @dev 获取总供应量
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev 检查token是否存在
     */
    function exists(uint256 tokenId) public view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}

