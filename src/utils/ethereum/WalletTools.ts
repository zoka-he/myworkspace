import { INetworkInfo, IProviderInfo, ITransactionFields, IWalletAccount, MetamaskTool } from "./metamask";

export abstract class WalletTool {
    abstract connect(): Promise<{ info: IProviderInfo | null, provider: any }>;
    abstract isConnected(): Promise<boolean>;
    abstract onChainChanged(callback: (chainId: string) => void): void;
    abstract onAccountsChanged(callback: (accounts: string[]) => void): void;
    abstract offAllListeners(): void;
    abstract requestAccountsAddress(): Promise<string[]>;
    abstract requestBalance(address?: string): Promise<string>;
    abstract requestChainId(): Promise<string>;
    abstract requestBlockNumber(): Promise<number>;
    abstract requestGasPrice(): Promise<string>;
    abstract requestWalletInfo(): Promise<null | IWalletAccount & INetworkInfo & { custom: boolean, isConnected: boolean }>;
    abstract sendTransaction(params: ITransactionFields): Promise<string | null>;
    abstract waitForTransactionReceipt(txHash: string): Promise<any>;

    public static from(provider: any): WalletTool {
        if (!provider) {
            throw new Error('provider is required');
        }

        // okx钱包的isMetaMask也为true，所以需要先判断isOkxWallet
        if (provider.isOkxWallet) {
            // 延迟导入，避免循环依赖
            const { OkxWalletTool } = require("./okxwaller");
            return new OkxWalletTool(provider);
        }

        if (provider.isMetaMask) {
            const { MetamaskTool } = require("./metamask");
            return new MetamaskTool(provider);
        }  

        console.error('Unsupported provider', provider);
        throw new Error('Unsupported provider');
    }
}


  
  // 钱包工具类（原生实现）
//   export class MetamaskTool {
  
//     private chainChangeHandler: ((chainId: string) => void) | null = null;
//     private accountsChangedHandler: ((accounts: string[]) => void) | null = null;
  
//     private gasPrice: string | null = null;
//     private blockNumber: number | null = null;
//     private chainId: string | null = null;
//     private accounts: string[] | null = null;
//     private balance: string | null = null;
//     private networkName: string | null = null;
//     private networkInfo: Network | null = null;
//     private feeData: FeeData | null = null;
  
//     constructor(private readonly provider: any) {
  
//       if (typeof provider === 'string') {
//         this.provider = getProvider(provider);
//       } else {
//         this.provider = provider;
//       }
  
//       if (!provider) {
//         throw new Error('provider is required');
//       }
//     }
  
//     public onChainChanged(callback: (chainId: string) => void): void {
//       if (this.chainChangeHandler) {
//         this.provider.removeListener('chainChanged', this.chainChangeHandler);
//       }
//       this.chainChangeHandler = callback;
//       this.provider.on('chainChanged', callback);
//     }
  
//     public onAccountsChanged(callback: (accounts: string[]) => void): void {
//       if (this.accountsChangedHandler) {
//         this.provider.removeListener('accountsChanged', this.accountsChangedHandler);
//       }
//       this.accountsChangedHandler = callback;
//       this.provider.on('accountsChanged', callback);
//     }
  
//     public offAllListeners(): void {
//       if (this.chainChangeHandler) {
//         this.provider.removeListener('chainChanged', this.chainChangeHandler);
//       }
//       if (this.accountsChangedHandler) {
//         this.provider.removeListener('accountsChanged', this.accountsChangedHandler);
//       }
//       this.chainChangeHandler = null;
//       this.accountsChangedHandler = null;
//     }
  
//     public getAccounts(): string[] | null {
//       return this.accounts;
//     }
  
//     public getSelectedAddress(): string | null {
//       return this.provider.selectedAddress;
//     }
  
//     public getBalance(): string | null {
//       return this.balance;
//     }
  
//     public getChainId(): string | null {
//       return this.chainId;
//     }
  
//     public getBlockNumber(): number | null {
//       return this.blockNumber;
//     }
  
//     public getGasPrice(): string | null {
//       return this.gasPrice;
//     }
  
//     public async requestAccountsAddress(): Promise<string[]> {
//       const response = await this.provider.request({
//         method: 'eth_requestAccounts'
//       });
//       this.accounts = response;
//       return response;
//     }
  
//     public async requestBalance(address?: string): Promise<string> {
//       if (!address) {
//         address = this.provider.selectedAddress;
//       }
  
//       const balance = await this.provider.request({
//         method: 'eth_getBalance',
//         params: [address, 'latest']
//       })
  
//       this.balance = balance;
//       return balance;
//     }
  
//     public async requestChainId(): Promise<string> {
//       const chainId = await this.provider.request({
//         method: 'eth_chainId',
//         params: []
//       })
//       this.chainId = chainId;
//       return chainId;
//     }
  
//     public async requestBlockNumber(): Promise<number> {
//       const blockNumber = await this.provider.request({
//         method: 'eth_blockNumber',
//         params: []
//       })
//       this.blockNumber = blockNumber;
//       return blockNumber;
//     }
  
//     public async requestGasPrice(): Promise<string> {
//       const gasPrice = await this.provider.request({
//         method: 'eth_gasPrice',
//         params: []
//       })
//       this.gasPrice = gasPrice;
//       return gasPrice;
//     }
  
//     public async requestWalletInfo(): Promise<IWalletAccount & INetworkInfo & { custom: boolean, isConnected: boolean }> {
//       try {
//         const [accounts, balance, chainId, blockNumber, gasPrice] = await Promise.all([
//           this.requestAccountsAddress(),
//           this.requestBalance(),
//           this.requestChainId(),
//           this.requestBlockNumber(),
//           this.requestGasPrice()
//         ])
  
//         return {
//           accounts,
//           selectedAddress: this.provider.selectedAddress,
//           balance: balance,
//           chainId: chainId,
//           blockNumber: blockNumber,
//           gasPrice: gasPrice,
//           custom: false,
//           isConnected: true
//         }
  
//       } catch (error) {
//         console.error('获取钱包信息失败:', error);
//         return null;
//       }
//     }
  
//     /**
//      * 发送交易，并返回交易的hash
//      * @param params 
//      * @returns 
//      */
//     public async sendTransaction(params: ITransactionFields): Promise<string | null> {
//       try {
//         const txHash = await this.provider.request({
//           method: 'eth_sendTransaction',
//           params: [params]
//         })
//         return txHash;
//       } catch (error) {
//         console.error('发送交易失败:', error);
//         return null;
//       }
//     }
  
//     /**
//      * 查询交易结果，并返回交易信息
//      * @param txHash 
//      * @returns 未打包返回null，成功status为1，否则为0
//      */
//     public async waitForTransactionReceipt(txHash: string): Promise<any> {
//       const receipt = await this.provider.request({
//         method: 'eth_getTransactionReceipt',
//         params: [txHash]
//       })
//       return receipt;
//     }
  
//   }
  
//   export class OkxWalletTool extends WalletTool {
//     onChainChanged(callback: (chainId: string) => void): void {
//       throw new Error('Method not implemented.');
//     }
//     onAccountsChanged(callback: (accounts: string[]) => void): void {
//       throw new Error('Method not implemented.');
//     }
//     offAllListeners(): void {
//       throw new Error('Method not implemented.');
//     }
//     requestAccountsAddress(): Promise<string[]> {
//       throw new Error('Method not implemented.');
//     }
//     requestBalance(address?: string): Promise<string> {
//       throw new Error('Method not implemented.');
//     }
//     requestChainId(): Promise<string> {
//       throw new Error('Method not implemented.');
//     }
//     requestBlockNumber(): Promise<number> {
//       throw new Error('Method not implemented.');
//     }
//     requestGasPrice(): Promise<string> {
//       throw new Error('Method not implemented.');
//     }
//     requestWalletInfo(): Promise<IWalletAccount & INetworkInfo & { custom: boolean; isConnected: boolean; }> {
//       throw new Error('Method not implemented.');
//     }
//     sendTransaction(params: ITransactionFields): Promise<string | null> {
//       throw new Error('Method not implemented.');
//     }
//     waitForTransactionReceipt(txHash: string): Promise<any> {
//       throw new Error('Method not implemented.');
//     }
  
//     constructor(private readonly provider: any) {
//       super();
  
//       if (!provider.isOkxWallet) {
//         throw new Error('provider is not OkxWallet');
//       }
//     }
  
    
//   }
  