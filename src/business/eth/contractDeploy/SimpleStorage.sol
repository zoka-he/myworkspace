// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleStorage
 * @dev 一个简单的存储合约示例
 * 用于演示智能合约部署和交互
 */
contract SimpleStorage {
    // 状态变量
    uint256 private storedData;
    address public owner;
    
    // 事件
    event DataStored(uint256 indexed oldValue, uint256 indexed newValue, address indexed setter);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // 修饰器
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    /**
     * @dev 构造函数，初始化owner
     */
    constructor() {
        owner = msg.sender;
        storedData = 0;
    }
    
    /**
     * @dev 存储一个新值
     * @param x 要存储的值
     */
    function set(uint256 x) public {
        uint256 oldValue = storedData;
        storedData = x;
        emit DataStored(oldValue, x, msg.sender);
    }
    
    /**
     * @dev 获取存储的值
     * @return 存储的值
     */
    function get() public view returns (uint256) {
        return storedData;
    }
    
    /**
     * @dev 增加存储的值
     * @param x 要增加的值
     */
    function increment(uint256 x) public {
        uint256 oldValue = storedData;
        storedData += x;
        emit DataStored(oldValue, storedData, msg.sender);
    }
    
    /**
     * @dev 减少存储的值
     * @param x 要减少的值
     */
    function decrement(uint256 x) public {
        require(storedData >= x, "Value would be negative");
        uint256 oldValue = storedData;
        storedData -= x;
        emit DataStored(oldValue, storedData, msg.sender);
    }
    
    /**
     * @dev 重置存储的值为0（仅owner可调用）
     */
    function reset() public onlyOwner {
        uint256 oldValue = storedData;
        storedData = 0;
        emit DataStored(oldValue, 0, msg.sender);
    }
    
    /**
     * @dev 转移所有权
     * @param newOwner 新owner的地址
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

/**
 * 使用说明：
 * 
 * 1. 部署合约：
 *    - 无需构造函数参数
 *    - 部署者自动成为owner
 * 
 * 2. 基本操作：
 *    - set(123): 设置值为123
 *    - get(): 查询当前值
 *    - increment(10): 当前值加10
 *    - decrement(5): 当前值减5
 * 
 * 3. Owner操作：
 *    - reset(): 重置值为0
 *    - transferOwnership(address): 转移所有权
 * 
 * 4. 在Remix中编译：
 *    - 编译器版本：0.8.0或更高
 *    - 优化：200 runs
 *    - 复制ABI和Bytecode到部署界面
 */

