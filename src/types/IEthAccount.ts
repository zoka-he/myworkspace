export interface IEthAccount {
    id?: number;
    name: string;
    address: string;
    private_key?: string;
    balance: number;
    network_id: number;
    network: string;
    chain_id: number;
    remark?: string;
    create_time?: string;
    update_time?: string;
    mnemonic_phrase?: string;
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
    vendor?: string;
}

export interface IEthAccountBalance {
    address: string;
    chain_id: number;
    balance: number;
    unit: string;
    update_time: Date;
}
