export interface IEthAccount {
    id?: number;
    name: string;
    address: string;
    private_key?: string;
    balance: number;
    network: 'mainnet' | 'testnet' | 'ropsten' | 'rinkeby' | 'goerli';
    remark?: string;
    create_time?: string;
    update_time?: string;
}

export interface IEthTransaction {
    id?: number;
    from: string;
    to: string;
    value: string;
    gasPrice: string;
    gasLimit: string;
    nonce: number;
    hash?: string;
    status: 'pending' | 'confirmed' | 'failed';
    blockNumber?: number;
    createTime?: string;
}

export interface IEthNetwork {
    id?: number;
    name: string;
    chain_id: number;
    rpc_url: string;
    explorer_url: string;
    is_testnet: boolean;
    create_time?: string;
    update_time?: string;
}
