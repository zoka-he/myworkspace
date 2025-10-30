import { ethers, Network, FeeData } from 'ethers';

export interface WalletInfo {
  address: string;
  balance: string;
  chainId: string;
  networkName: string;
  isConnected: boolean;
  networkInfo?: Network;
  feeData?: FeeData;
  blockNumber?: number;
  custom?: boolean;
}

export interface NetworkInfo {
  chainId: string;
  name: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// 检查是否安装了MetaMask
export function isMetaMaskInstalled(): boolean {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

// 检查是否已连接
export function isConnected(): boolean {
  return isMetaMaskInstalled() && window.ethereum.selectedAddress !== null;
}

// 连接MetaMask钱包
export async function connectWallet(): Promise<WalletInfo | null> {
  if (!isMetaMaskInstalled()) {
    throw new Error('请先安装MetaMask钱包');
  }

  try {
    // 请求连接钱包
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    if (accounts.length === 0) {
      throw new Error('未获取到账户信息');
    }

    return await getWalletInfo();
    
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('用户拒绝了连接请求');
    }
    throw new Error(error.message || '连接钱包失败');
  }
}

// 获取当前钱包信息
export async function getWalletInfo(): Promise<WalletInfo | null> {
  if (!isMetaMaskInstalled() || !isConnected()) {
    return null;
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const balance = await provider.getBalance(address);
    const network = await provider.getNetwork();
    const feeData = await provider.getFeeData();
    const blockNumber = await provider.getBlockNumber();

    return {
      address,
      balance: ethers.formatEther(balance),
      chainId: network.chainId.toString(),
      networkName: network.name,
      isConnected: true,
      networkInfo: network,
      feeData: feeData,
      blockNumber: blockNumber,
      custom: false
    };
  } catch (error) {
    console.error('获取钱包信息失败:', error);
    return null;
  }
}

// 切换网络
export async function switchNetwork(chainId: string): Promise<void> {
  if (!isMetaMaskInstalled()) {
    throw new Error('请先安装MetaMask钱包');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }]
    });
  } catch (error: any) {
    if (error.code === 4902) {
      throw new Error('请先添加该网络到MetaMask');
    }
    throw new Error(error.message || '切换网络失败');
  }
}

// 添加网络
export async function addNetwork(networkInfo: NetworkInfo): Promise<void> {
  if (!isMetaMaskInstalled()) {
    throw new Error('请先安装MetaMask钱包');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: networkInfo.chainId,
        chainName: networkInfo.name,
        rpcUrls: [networkInfo.rpcUrl],
        blockExplorerUrls: [networkInfo.blockExplorerUrl],
        nativeCurrency: networkInfo.nativeCurrency
      }]
    });
  } catch (error: any) {
    throw new Error(error.message || '添加网络失败');
  }
}

// 监听账户变化
export function onAccountsChanged(callback: (accounts: string[]) => void): () => void {
  if (!isMetaMaskInstalled()) {
    return () => {};
  }

  const handler = (accounts: string[]) => {
    callback(accounts);
  };

  window.ethereum.on('accountsChanged', handler);

  return () => {
    window.ethereum.removeListener('accountsChanged', handler);
  };
}

// 监听网络变化
export function onChainChanged(callback: (chainId: string) => void): () => void {
  if (!isMetaMaskInstalled()) {
    return () => {};
  }

  const handler = (chainId: string) => {
    callback(chainId);
  };

  window.ethereum.on('chainChanged', handler);

  return () => {
    window.ethereum.removeListener('chainChanged', handler);
  };
}

// // 预定义网络配置
// export const PREDEFINED_NETWORKS: Record<string, NetworkInfo> = {
//   '1': {
//     chainId: '0x1',
//     name: 'Ethereum Mainnet',
//     rpcUrl: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
//     blockExplorerUrl: 'https://etherscan.io',
//     nativeCurrency: {
//       name: 'Ether',
//       symbol: 'ETH',
//       decimals: 18
//     }
//   },
//   '11155111': {
//     chainId: '0xaa36a7',
//     name: 'Sepolia Testnet',
//     rpcUrl: 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID',
//     blockExplorerUrl: 'https://sepolia.etherscan.io',
//     nativeCurrency: {
//       name: 'Sepolia Ether',
//       symbol: 'SepoliaETH',
//       decimals: 18
//     }
//   },
//   '5': {
//     chainId: '0x5',
//     name: 'Goerli Testnet',
//     rpcUrl: 'https://goerli.infura.io/v3/YOUR_PROJECT_ID',
//     blockExplorerUrl: 'https://goerli.etherscan.io',
//     nativeCurrency: {
//       name: 'Goerli Ether',
//       symbol: 'GoerliETH',
//       decimals: 18
//     }
//   }
// };

// 声明全局类型
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
      selectedAddress: string | null;
    };
  }
}
