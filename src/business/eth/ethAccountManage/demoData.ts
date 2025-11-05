import { IEthAccount } from '../../../types/IEthAccount';

export const demoAccounts: IEthAccount[] = [
    {
        id: 1,
        name: '主账户',
        address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        balance: 1.5,
        network: 'mainnet',
        remark: '主要交易账户',
        createTime: '2024-01-15T10:30:00Z',
        updateTime: '2024-01-15T10:30:00Z'
    },
    {
        id: 2,
        name: '测试账户1',
        address: '0x8ba1f109551bD432803012645Hac136c',
        privateKey: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        balance: 0.0,
        network: 'testnet',
        remark: '用于测试的账户',
        createTime: '2024-01-16T14:20:00Z',
        updateTime: '2024-01-16T14:20:00Z'
    },
    {
        id: 3,
        name: '开发账户',
        address: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
        privateKey: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
        balance: 2.3,
        network: 'ropsten',
        remark: '开发环境使用',
        createTime: '2024-01-17T09:15:00Z',
        updateTime: '2024-01-17T09:15:00Z'
    },
    {
        id: 4,
        name: '冷钱包',
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        balance: 10.0,
        network: 'mainnet',
        remark: '冷存储钱包，私钥离线保存',
        createTime: '2024-01-18T16:45:00Z',
        updateTime: '2024-01-18T16:45:00Z'
    },
    {
        id: 5,
        name: 'Goerli测试',
        address: '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db',
        privateKey: '0x1111111111111111111111111111111111111111111111111111111111111111',
        balance: 0.1,
        network: 'goerli',
        remark: 'Goerli测试网络账户',
        createTime: '2024-01-19T11:30:00Z',
        updateTime: '2024-01-19T11:30:00Z'
    }
];
