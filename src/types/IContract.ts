// 智能合约接口定义
export interface IContract {
    id?: number;
    name: string;
    address?: string; // 未部署时可能为空
    deployer_address?: string; // 部署者地址，未部署时可能为空
    deployer_account_id?: number; // 部署者账户ID，未部署时可能为空
    network_id?: number; // 网络ID，未部署时可能为空
    network?: string; // 网络名称，未部署时可能为空
    chain_id?: number; // 链ID，未部署时可能为空
    abi?: string; // JSON string, 未编译时可能为空
    bytecode?: string; // 未编译时可能为空
    source_code?: string;
    constructor_params?: string; // JSON string
    status: 'undeployed' | 'deployed' | 'pending' | 'failed' | 'deprecated';
    remark?: string;
    create_time?: string;
    update_time?: string;
}

// 合约方法接口
export interface IContractMethod {
    type: 'function' | 'constructor' | 'event' | 'fallback' | 'receive';
    name?: string;
    inputs?: IContractMethodInput[];
    outputs?: IContractMethodOutput[];
    stateMutability?: 'pure' | 'view' | 'nonpayable' | 'payable';
    constant?: boolean;
    payable?: boolean;
    anonymous?: boolean;
}

// 合约方法输入参数
export interface IContractMethodInput {
    name: string;
    type: string;
    indexed?: boolean;
    internalType?: string;
    components?: IContractMethodInput[]; // for tuples
}

// 合约方法输出参数
export interface IContractMethodOutput {
    name: string;
    type: string;
    internalType?: string;
    components?: IContractMethodOutput[]; // for tuples
}

// 合约事件
export interface IContractEvent {
    type: 'event';
    name: string;
    inputs: IContractMethodInput[];
    anonymous?: boolean;
}

// 合约ABI项
export interface IContractAbiItem {
    type: 'function' | 'constructor' | 'event' | 'fallback' | 'receive';
    name?: string;
    inputs?: IContractMethodInput[];
    outputs?: IContractMethodOutput[];
    stateMutability?: 'pure' | 'view' | 'nonpayable' | 'payable';
    anonymous?: boolean;
}

// 合约编译结果
export interface ICompiledContract {
    name: string;
    abi: IContractAbiItem[];
    bytecode: string;
    deployedBytecode?: string;
    metadata?: string;
}

// 合约部署参数
export interface IContractDeployParams {
    name: string;
    accountId: number;
    constructorParams?: any[];
    remark?: string;
}

// 合约交互参数
export interface IContractInteractParams {
    contractId: number;
    methodName: string;
    params?: any[];
    accountId?: number; // For transactions
    value?: string; // For payable methods
}

// 合约调用结果
export interface IContractCallResult {
    success: boolean;
    data?: any;
    error?: string;
    transactionHash?: string;
    blockNumber?: number;
    gasUsed?: string;
}

// 合约部署历史
export interface IContractDeployHistory {
    id?: number;
    contract_id: number;
    transaction_hash: string;
    deployer_address: string;
    network: string;
    chain_id: number;
    gas_used?: string;
    gas_price?: string;
    status: 'pending' | 'confirmed' | 'failed';
    block_number?: number;
    create_time?: string;
}

// 合约交互历史
export interface IContractInteractHistory {
    id?: number;
    contract_id: number;
    method_name: string;
    params?: string; // JSON string
    caller_address: string;
    transaction_hash?: string;
    status: 'pending' | 'success' | 'failed';
    result?: string;
    error?: string;
    gas_used?: string;
    create_time?: string;
}

