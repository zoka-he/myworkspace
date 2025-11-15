// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NFTWithRoyalty
 * @dev 支持版税（EIP-2981）的ERC-721 NFT合约
 * 特点：
 * - 支持NFT版税标准（EIP-2981）
 * - 可为每个NFT设置独立的版税
 * - 支持元数据URI
 */
contract NFTWithRoyalty is ERC721URIStorage, ERC721Royalty, Ownable {
    uint256 private _tokenIdCounter;
    
    // 默认版税接收地址
    address private _defaultRoyaltyReceiver;
    // 默认版税比例（基点，10000 = 100%）
    uint96 private _defaultRoyaltyFraction;

    // 事件
    event NFTMinted(
        address indexed to, 
        uint256 indexed tokenId, 
        string tokenURI,
        address royaltyReceiver,
        uint96 royaltyFraction
    );
    event DefaultRoyaltyUpdated(address receiver, uint96 feeNumerator);

    constructor(
        string memory name,
        string memory symbol,
        address royaltyReceiver,
        uint96 royaltyFraction
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _defaultRoyaltyReceiver = royaltyReceiver;
        _defaultRoyaltyFraction = royaltyFraction;
        _setDefaultRoyalty(royaltyReceiver, royaltyFraction);
    }

    /**
     * @dev 设置默认版税
     * @param receiver 版税接收地址
     * @param feeNumerator 版税比例（基点，例如500表示5%）
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) 
        public 
        onlyOwner 
    {
        _defaultRoyaltyReceiver = receiver;
        _defaultRoyaltyFraction = feeNumerator;
        _setDefaultRoyalty(receiver, feeNumerator);
        
        emit DefaultRoyaltyUpdated(receiver, feeNumerator);
    }

    /**
     * @dev 铸造NFT（使用默认版税）
     * @param to 接收者地址
     * @param uri 元数据URI
     */
    function safeMint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit NFTMinted(
            to, 
            tokenId, 
            uri, 
            _defaultRoyaltyReceiver, 
            _defaultRoyaltyFraction
        );
    }

    /**
     * @dev 铸造NFT（自定义版税）
     * @param to 接收者地址
     * @param tokenId Token ID
     * @param uri 元数据URI
     * @param royaltyReceiver 版税接收地址
     * @param royaltyFraction 版税比例（基点）
     */
    function mintWithCustomRoyalty(
        address to,
        uint256 tokenId,
        string memory uri,
        address royaltyReceiver,
        uint96 royaltyFraction
    ) public onlyOwner {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _setTokenRoyalty(tokenId, royaltyReceiver, royaltyFraction);
        
        if (tokenId >= _tokenIdCounter) {
            _tokenIdCounter = tokenId + 1;
        }
        
        emit NFTMinted(to, tokenId, uri, royaltyReceiver, royaltyFraction);
    }

    /**
     * @dev 更新特定NFT的版税
     * @param tokenId Token ID
     * @param receiver 版税接收地址
     * @param feeNumerator 版税比例（基点）
     */
    function setTokenRoyalty(
        uint256 tokenId,
        address receiver,
        uint96 feeNumerator
    ) public onlyOwner {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    /**
     * @dev 获取总供应量
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev 获取默认版税信息
     */
    function getDefaultRoyalty() public view returns (address, uint96) {
        return (_defaultRoyaltyReceiver, _defaultRoyaltyFraction);
    }

    // 必须重写的函数
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721)
    {
        super._increaseBalance(account, value);
    }
}


