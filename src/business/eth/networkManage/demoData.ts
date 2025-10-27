import { IEthNetwork } from '../../../types/IEthAccount';

// 演示数据 - 常用以太坊网络配置
export const demoNetworks: IEthNetwork[] = [
    {
        id: 1,
        name: 'Ethereum Mainnet',
        chainId: 1,
        rpcUrl: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
        explorerUrl: 'https://etherscan.io',
        isTestnet: false,
        createTime: '2024-01-01T00:00:00Z',
        updateTime: '2024-01-01T00:00:00Z'
    },
    {
        id: 2,
        name: 'Ethereum Goerli',
        chainId: 5,
        rpcUrl: 'https://goerli.infura.io/v3/YOUR_PROJECT_ID',
        explorerUrl: 'https://goerli.etherscan.io',
        isTestnet: true,
        createTime: '2024-01-01T00:00:00Z',
        updateTime: '2024-01-01T00:00:00Z'
    },
    {
        id: 3,
        name: 'Ethereum Sepolia',
        chainId: 11155111,
        rpcUrl: 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID',
        explorerUrl: 'https://sepolia.etherscan.io',
        isTestnet: true,
        createTime: '2024-01-01T00:00:00Z',
        updateTime: '2024-01-01T00:00:00Z'
    },
    {
        id: 4,
        name: 'Polygon Mainnet',
        chainId: 137,
        rpcUrl: 'https://polygon-rpc.com',
        explorerUrl: 'https://polygonscan.com',
        isTestnet: false,
        createTime: '2024-01-01T00:00:00Z',
        updateTime: '2024-01-01T00:00:00Z'
    },
    {
        id: 5,
        name: 'Polygon Mumbai',
        chainId: 80001,
        rpcUrl: 'https://rpc-mumbai.maticvigil.com',
        explorerUrl: 'https://mumbai.polygonscan.com',
        isTestnet: true,
        createTime: '2024-01-01T00:00:00Z',
        updateTime: '2024-01-01T00:00:00Z'
    },
    {
        id: 6,
        name: 'BSC Mainnet',
        chainId: 56,
        rpcUrl: 'https://bsc-dataseed.binance.org',
        explorerUrl: 'https://bscscan.com',
        isTestnet: false,
        createTime: '2024-01-01T00:00:00Z',
        updateTime: '2024-01-01T00:00:00Z'
    },
    {
        id: 7,
        name: 'BSC Testnet',
        chainId: 97,
        rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
        explorerUrl: 'https://testnet.bscscan.com',
        isTestnet: true,
        createTime: '2024-01-01T00:00:00Z',
        updateTime: '2024-01-01T00:00:00Z'
    },
    {
        id: 8,
        name: 'Arbitrum One',
        chainId: 42161,
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        explorerUrl: 'https://arbiscan.io',
        isTestnet: false,
        createTime: '2024-01-01T00:00:00Z',
        updateTime: '2024-01-01T00:00:00Z'
    },
    {
        id: 9,
        name: 'Arbitrum Goerli',
        chainId: 421613,
        rpcUrl: 'https://goerli-rollup.arbitrum.io/rpc',
        explorerUrl: 'https://goerli.arbiscan.io',
        isTestnet: true,
        createTime: '2024-01-01T00:00:00Z',
        updateTime: '2024-01-01T00:00:00Z'
    },
    {
        id: 10,
        name: 'Optimism',
        chainId: 10,
        rpcUrl: 'https://mainnet.optimism.io',
        explorerUrl: 'https://optimistic.etherscan.io',
        isTestnet: false,
        createTime: '2024-01-01T00:00:00Z',
        updateTime: '2024-01-01T00:00:00Z'
    },
    {
        id: 11,
        name: 'Optimism Goerli',
        chainId: 420,
        rpcUrl: 'https://goerli.optimism.io',
        explorerUrl: 'https://goerli-optimism.etherscan.io',
        isTestnet: true,
        createTime: '2024-01-01T00:00:00Z',
        updateTime: '2024-01-01T00:00:00Z'
    }
];

// 网络配置模板
export const networkTemplates = {
    ethereum: {
        mainnet: {
            name: 'Ethereum Mainnet',
            chainId: 1,
            rpcUrl: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
            explorerUrl: 'https://etherscan.io',
            isTestnet: false
        },
        goerli: {
            name: 'Ethereum Goerli',
            chainId: 5,
            rpcUrl: 'https://goerli.infura.io/v3/YOUR_PROJECT_ID',
            explorerUrl: 'https://goerli.etherscan.io',
            isTestnet: true
        },
        sepolia: {
            name: 'Ethereum Sepolia',
            chainId: 11155111,
            rpcUrl: 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID',
            explorerUrl: 'https://sepolia.etherscan.io',
            isTestnet: true
        }
    },
    polygon: {
        mainnet: {
            name: 'Polygon Mainnet',
            chainId: 137,
            rpcUrl: 'https://polygon-rpc.com',
            explorerUrl: 'https://polygonscan.com',
            isTestnet: false
        },
        mumbai: {
            name: 'Polygon Mumbai',
            chainId: 80001,
            rpcUrl: 'https://rpc-mumbai.maticvigil.com',
            explorerUrl: 'https://mumbai.polygonscan.com',
            isTestnet: true
        }
    },
    bsc: {
        mainnet: {
            name: 'BSC Mainnet',
            chainId: 56,
            rpcUrl: 'https://bsc-dataseed.binance.org',
            explorerUrl: 'https://bscscan.com',
            isTestnet: false
        },
        testnet: {
            name: 'BSC Testnet',
            chainId: 97,
            rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
            explorerUrl: 'https://testnet.bscscan.com',
            isTestnet: true
        }
    }
};

// 常用RPC服务提供商
export const rpcProviders = {
    infura: {
        name: 'Infura',
        mainnet: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
        goerli: 'https://goerli.infura.io/v3/YOUR_PROJECT_ID',
        sepolia: 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID'
    },
    alchemy: {
        name: 'Alchemy',
        mainnet: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
        goerli: 'https://eth-goerli.g.alchemy.com/v2/YOUR_API_KEY',
        sepolia: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY'
    },
    quicknode: {
        name: 'QuickNode',
        mainnet: 'https://YOUR_ENDPOINT.quiknode.pro/YOUR_API_KEY/',
        goerli: 'https://YOUR_ENDPOINT.quiknode.pro/YOUR_API_KEY/',
        sepolia: 'https://YOUR_ENDPOINT.quiknode.pro/YOUR_API_KEY/'
    }
};
