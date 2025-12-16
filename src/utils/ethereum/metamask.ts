import { ethers, Network, FeeData } from 'ethers';
// import { MetaMaskSDK } from '@metamask/sdk';
import * as EtherConvertUtil from '@/src/business/eth/transaction/common/etherConvertUtil';

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

export interface IProviderInfo {
  rdns: string;
  name: string;
  icon: string;
  uuid: string;
}

export interface IProviderDetail {
}

export interface IWalletAccount {
  accounts: string[];
  selectedAddress: string;
  balance: string;
}

export interface INetworkInfo {
  blockNumber: number;
  chainId: string;
  gasPrice: string;
}

export interface ITransactionFields {
  to: string,
  from: string,
  gas: string,
  value: string,
  data: string,
  gasPrice: string
}

let G_METAMASK_INSTALLED = false;
let G_METAMASK_FLASK_INSTALLED = false;
let G_PROVIDERS = new Map<string, { provider: any, info: IProviderInfo }>();
let G_DETECTION_STARTED = false; // 标记是否已经启动检测

export function startDetectBrowserWalletProvider() {
  if (typeof window === 'undefined') {
    return false;
  }

  // 防止重复添加监听器
  if (G_DETECTION_STARTED) {
    console.debug('Provider detection already started, skipping...');
    // 即使已经启动，也重新请求一次，以防有新的 provider 加入
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    return true;
  }

  G_DETECTION_STARTED = true;

  const handleAnnounceProvider = (event: any) => {
    console.log('announceProvider', event);
    const providerDetail = event.detail;

    if (providerDetail.info.rdns === 'io.metamask') {
      console.log('使用eip6963方式检测到Metamask');
      G_METAMASK_INSTALLED = true;
      G_PROVIDERS.set('io.metamask', providerDetail);
    }

    if (providerDetail.info.rdns === 'io.metamask.flask') {
      console.log('使用eip6963方式检测到Metamask Flask');
      G_METAMASK_FLASK_INSTALLED = true;
      G_PROVIDERS.set('io.metamask.flask', providerDetail);
    }
  };

  window.addEventListener("eip6963:announceProvider", handleAnnounceProvider);

  // 请求已安装的 provider 宣布自己
  window.dispatchEvent(new Event('eip6963:requestProvider'));

  return true;
}

// 检查是否安装了MetaMask
export function isMetaMaskInstalled(): boolean {
  if (G_METAMASK_INSTALLED || G_METAMASK_FLASK_INSTALLED) {
    return true;
  }

  return window?.ethereum?.isMetaMask ?? false;
}

export function listProviderInfos(): IProviderInfo[] {
  let infos = Array.from(G_PROVIDERS.values()).map(({info}) => info);
  console.debug('listProviderInfos -->', infos);
  return infos;
}

export function getProviderInfoByRdns(rdns: string): IProviderInfo | null {
  return G_PROVIDERS.get(rdns)?.info ?? null;
}

export function getInstalledProvider(): { provider: any, info: IProviderInfo }[] {
  return Array.from(G_PROVIDERS.entries()).map(([_, value]) => value);
}

export function getProvider(rdns: string | null = null) {
  if (rdns) {
    return G_PROVIDERS.get(rdns)?.provider;
  }

  return window.ethereum;
}

// 检查是否已连接
export function isConnected(providerOrRdns: any = null): boolean {
  console.debug('isConnected parameter:', arguments);

  let provider = null;
  if (typeof providerOrRdns === 'string') {
    provider = getProvider(providerOrRdns);
  } else {
    provider = providerOrRdns;
  }

  if (!provider) {
    console.debug('isConnected provider is null');
    return false;
  }

  return provider?.selectedAddress !== null;
}


// 连接MetaMask钱包
export async function connectWallet(rdns: string): Promise<{ info: IProviderInfo | null, provider: any }> {

  let provider = null;
  if (rdns) {
    provider = getProvider(rdns);
  } else {
    provider = window.ethereum;
  }

  if (!provider) {
    throw new Error('请先安装MetaMask钱包或其他浏览器钱包');
  }

  // 请求连接钱包
  const accounts = await provider.request({
    method: 'eth_requestAccounts'
  });

  if (accounts.length === 0) {
    throw new Error('未获取到账户信息');
  }

  return {
    info: G_PROVIDERS.get(rdns)?.info ?? null,
    provider: provider,
  }
}

export async function disconnectWallet(rdns: string | null = null): Promise<void> {
  let provider = getProvider(rdns);
  if (!provider) {
    throw new Error('请先安装MetaMask钱包或其他浏览器钱包');
  }

  await provider.request({
    method: 'eth_requestAccounts'
  });
}

// 获取当前钱包信息
export async function getWalletInfo(): Promise<WalletInfo | null> {
  
  // if (!isMetaMaskInstalled() || !isConnected()) {
  //   return null;
  // }

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
export function onAccountsChanged(providerRdns: string | null = null, callback: (accounts: string[]) => void): () => void {
  let provider = getProvider(providerRdns);
  if (!provider) {
    return () => {};
  }

  const handler = (accounts: string[]) => {
    console.debug('accountsChanged', accounts);
    callback(accounts);
  };

  provider.on('accountsChanged', handler);

  return () => {
    provider.removeListener('accountsChanged', handler);
  };
}

export function onProviderAccountsChanged(providerRdns: string, callback: (accounts: string[]) => void): () => void {
  const providerDetail = G_PROVIDERS.get(providerRdns);
  if (!providerDetail) {
    return () => {};
  }
  
  providerDetail.provider.on('accountsChanged', callback);

  return () => {
    providerDetail.provider.removeListener('accountsChanged', callback);
  };
}

// 监听网络变化
// export function onChainChanged(rdns: string | null = null, callback: (chainId: string) => void): () => void {
//   let provider = getProvider(rdns);
//   if (!provider) {
//     return () => {};
//   }
  
//   const handler = (chainId: string) => {
//     callback(chainId);
//   };

//   window.ethereum.on('chainChanged', handler);

//   return () => {
//     window.ethereum.removeListener('chainChanged', handler);
//   };
// }

// export function onProviderChainChanged(providerRdns: string, callback: (chainId: string) => void): () => void {
//   const providerDetail = G_PROVIDERS.get(providerRdns);
//   if (!providerDetail) {
//     return () => {};
//   }
  
//   providerDetail.provider.on('chainChanged', callback);

//   return () => {
//     providerDetail.provider.removeListener('chainChanged', callback);
//   };
// }

export const readableAmount = EtherConvertUtil.readableAmount;

// export function readableAmount(value: string) {
//   if (!value) {
//     return '--'
//   }
//   return EtherConvertUtil.readableAmount(value);
// }

// 钱包工具类（原生实现）
export class MetamaskTool {

  private chainChangeHandler: ((chainId: string) => void) | null = null;
  private accountsChangedHandler: ((accounts: string[]) => void) | null = null;

  private gasPrice: string | null = null;
  private blockNumber: number | null = null;
  private chainId: string | null = null;
  private accounts: string[] | null = null;
  private balance: string | null = null;
  private networkName: string | null = null;
  private networkInfo: Network | null = null;
  private feeData: FeeData | null = null;

  constructor(private readonly provider: any) {

    if (typeof provider === 'string') {
      this.provider = getProvider(provider);
    } else {
      this.provider = provider;
    }

    if (!provider) {
      throw new Error('provider is required');
    }
  }

  public onChainChanged(callback: (chainId: string) => void): void {
    if (this.chainChangeHandler) {
      this.provider.removeListener('chainChanged', this.chainChangeHandler);
    }
    this.chainChangeHandler = callback;
    this.provider.on('chainChanged', callback);
  }

  public onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (this.accountsChangedHandler) {
      this.provider.removeListener('accountsChanged', this.accountsChangedHandler);
    }
    this.accountsChangedHandler = callback;
    this.provider.on('accountsChanged', callback);
  }

  public offAllListeners(): void {
    if (this.chainChangeHandler) {
      this.provider.removeListener('chainChanged', this.chainChangeHandler);
    }
    if (this.accountsChangedHandler) {
      this.provider.removeListener('accountsChanged', this.accountsChangedHandler);
    }
    this.chainChangeHandler = null;
    this.accountsChangedHandler = null;
  }

  public getAccounts(): string[] | null {
    return this.accounts;
  }

  public getSelectedAddress(): string | null {
    return this.provider.selectedAddress;
  }

  public getBalance(): string | null {
    return this.balance;
  }

  public getChainId(): string | null {
    return this.chainId;
  }

  public getBlockNumber(): number | null {
    return this.blockNumber;
  }

  public getGasPrice(): string | null {
    return this.gasPrice;
  }

  public async requestAccountsAddress(): Promise<string[]> {
    const response = await this.provider.request({
      method: 'eth_requestAccounts'
    });
    this.accounts = response;
    return response;
  }

  public async requestBalance(address?: string): Promise<string> {
    if (!address) {
      address = this.provider.selectedAddress;
    }

    const balance = await this.provider.request({
      method: 'eth_getBalance',
      params: [address, 'latest']
    })

    this.balance = balance;
    return balance;
  }

  public async requestChainId(): Promise<string> {
    const chainId = await this.provider.request({
      method: 'eth_chainId',
      params: []
    })
    this.chainId = chainId;
    return chainId;
  }

  public async requestBlockNumber(): Promise<number> {
    const blockNumber = await this.provider.request({
      method: 'eth_blockNumber',
      params: []
    })
    this.blockNumber = blockNumber;
    return blockNumber;
  }

  public async requestGasPrice(): Promise<string> {
    const gasPrice = await this.provider.request({
      method: 'eth_gasPrice',
      params: []
    })
    this.gasPrice = gasPrice;
    return gasPrice;
  }

  public async requestWalletInfo(): Promise<IWalletAccount & INetworkInfo & { custom: boolean, isConnected: boolean }> {
    try {
      const [accounts, balance, chainId, blockNumber, gasPrice] = await Promise.all([
        this.requestAccountsAddress(),
        this.requestBalance(),
        this.requestChainId(),
        this.requestBlockNumber(),
        this.requestGasPrice()
      ])

      return {
        accounts,
        selectedAddress: this.provider.selectedAddress,
        balance: balance,
        chainId: chainId,
        blockNumber: blockNumber,
        gasPrice: gasPrice,
        custom: false,
        isConnected: true
      }

    } catch (error) {
      console.error('获取钱包信息失败:', error);
      return null;
    }
  }

  /**
   * 发送交易，并返回交易的hash
   * @param params 
   * @returns 
   */
  public async sendTransaction(params: ITransactionFields): Promise<string | null> {
    try {
      const txHash = await this.provider.request({
        method: 'eth_sendTransaction',
        params: [params]
      })
      return txHash;
    } catch (error) {
      console.error('发送交易失败:', error);
      return null;
    }
  }

  /**
   * 查询交易结果，并返回交易信息
   * @param txHash 
   * @returns 未打包返回null，成功status为1，否则为0
   */
  public async waitForTransactionReceipt(txHash: string): Promise<any> {
    const receipt = await this.provider.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash]
    })
    return receipt;
  }

}
