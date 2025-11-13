// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BasicNFT
 * @dev 基础的ERC-721 NFT合约
 * 特点：
 * - 简单的mint功能
 * - 只有owner可以铸造
 * - 自动递增Token ID
 */
contract BasicNFT is ERC721, Ownable {
    uint256 private _tokenIdCounter;

    constructor() ERC721("BasicNFT", "BNFT") Ownable(msg.sender) {}

    /**
     * @dev 铸造新的NFT
     * @param to 接收者地址
     */
    function safeMint(address to) public onlyOwner {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _safeMint(to, tokenId);
    }

    /**
     * @dev 铸造指定Token ID的NFT
     * @param to 接收者地址
     * @param tokenId 指定的Token ID
     */
    function safeMint(address to, uint256 tokenId) public onlyOwner {
        _safeMint(to, tokenId);
        if (tokenId >= _tokenIdCounter) {
            _tokenIdCounter = tokenId + 1;
        }
    }

    /**
     * @dev 批量铸造NFT
     * @param to 接收者地址
     * @param amount 铸造数量
     */
    function batchMint(address to, uint256 amount) public onlyOwner {
        for (uint256 i = 0; i < amount; i++) {
            uint256 tokenId = _tokenIdCounter;
            _tokenIdCounter++;
            _safeMint(to, tokenId);
        }
    }

    /**
     * @dev 获取总供应量
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }
}

