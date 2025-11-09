// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleToken
 * @dev 一个简单的ERC20代币示例
 * 演示带构造函数参数的合约部署
 */
contract SimpleToken {
    // 状态变量
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    address public owner;
    
    // 余额映射
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // 事件
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 value);
    event Burn(address indexed from, uint256 value);
    
    // 修饰器
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    /**
     * @dev 构造函数
     * @param _name 代币名称
     * @param _symbol 代币符号
     * @param _decimals 小数位数
     * @param _initialSupply 初始供应量
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        owner = msg.sender;
        
        // 将初始供应量分配给部署者
        totalSupply = _initialSupply * 10**uint256(_decimals);
        balanceOf[msg.sender] = totalSupply;
        
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    /**
     * @dev 转账
     * @param _to 接收地址
     * @param _value 转账金额
     */
    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(_to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        
        emit Transfer(msg.sender, _to, _value);
        return true;
    }
    
    /**
     * @dev 授权
     * @param _spender 被授权地址
     * @param _value 授权金额
     */
    function approve(address _spender, uint256 _value) public returns (bool success) {
        require(_spender != address(0), "Cannot approve to zero address");
        
        allowance[msg.sender][_spender] = _value;
        
        emit Approval(msg.sender, _spender, _value);
        return true;
    }
    
    /**
     * @dev 授权转账
     * @param _from 转出地址
     * @param _to 接收地址
     * @param _value 转账金额
     */
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        require(_to != address(0), "Cannot transfer to zero address");
        require(balanceOf[_from] >= _value, "Insufficient balance");
        require(allowance[_from][msg.sender] >= _value, "Insufficient allowance");
        
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        
        emit Transfer(_from, _to, _value);
        return true;
    }
    
    /**
     * @dev 增发代币（仅owner）
     * @param _to 接收地址
     * @param _value 增发数量
     */
    function mint(address _to, uint256 _value) public onlyOwner returns (bool success) {
        require(_to != address(0), "Cannot mint to zero address");
        
        totalSupply += _value;
        balanceOf[_to] += _value;
        
        emit Mint(_to, _value);
        emit Transfer(address(0), _to, _value);
        return true;
    }
    
    /**
     * @dev 销毁代币
     * @param _value 销毁数量
     */
    function burn(uint256 _value) public returns (bool success) {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        
        balanceOf[msg.sender] -= _value;
        totalSupply -= _value;
        
        emit Burn(msg.sender, _value);
        emit Transfer(msg.sender, address(0), _value);
        return true;
    }
    
    /**
     * @dev 查询余额
     * @param _owner 查询地址
     */
    function getBalance(address _owner) public view returns (uint256 balance) {
        return balanceOf[_owner];
    }
    
    /**
     * @dev 转移所有权
     * @param newOwner 新owner地址
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}

/**
 * 部署参数示例：
 * 
 * 1. _name: "My Token"
 * 2. _symbol: "MTK"
 * 3. _decimals: 18
 * 4. _initialSupply: 1000000 (表示1,000,000个代币)
 * 
 * 使用方法：
 * 
 * 1. View方法（无需Gas）：
 *    - name(): 查询代币名称
 *    - symbol(): 查询代币符号
 *    - decimals(): 查询小数位数
 *    - totalSupply(): 查询总供应量
 *    - balanceOf(address): 查询指定地址余额
 *    - getBalance(address): 查询余额（另一种方式）
 * 
 * 2. Transaction方法（需要Gas）：
 *    - transfer(address, uint256): 转账
 *    - approve(address, uint256): 授权
 *    - transferFrom(address, address, uint256): 授权转账
 *    - mint(address, uint256): 增发（仅owner）
 *    - burn(uint256): 销毁
 *    - transferOwnership(address): 转移所有权（仅owner）
 */

