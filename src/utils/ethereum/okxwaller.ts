import { INetworkInfo, IProviderInfo, ITransactionFields, IWalletAccount } from "./metamask";
import { WalletTool } from "./WalletTools";

export class OkxWalletTool extends WalletTool {

  private okxWallet: any;
  private chainChangeHandler: ((chainId: string) => void) | null = null;
  private accountsChangedHandler: ((accounts: string[]) => void) | null = null;

  public isSupportCoin(coin: string): boolean {
    switch (coin.toLowerCase()) {
      case 'eth':
        return true;
    }
    return false;
  }

  async connect(): Promise<{ info: IProviderInfo | null, provider: any }> {
    const accounts = await this.okxWallet.request({
      method: 'eth_requestAccounts'
    });
    if (accounts.length === 0) {
      throw new Error('未获取到账户信息');
    }
    return {
      info: this.okxWallet.info,
      provider: this.okxWallet,
    }
  }

  async isConnected(): Promise<boolean> {
    return this.okxWallet.isConnected();
  }

  onChainChanged(callback: (chainId: string) => void): void {
    if (this.chainChangeHandler) {
      this.okxWallet.removeListener('chainChanged', this.chainChangeHandler);
    }
    this.chainChangeHandler = callback;
    this.okxWallet.on('chainChanged', callback);
  }

  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (this.accountsChangedHandler) {
      this.okxWallet.removeListener('accountsChanged', this.accountsChangedHandler);
    }
    this.accountsChangedHandler = callback;
    this.okxWallet.on('accountsChanged', callback);
  }


  offAllListeners(): void {
    if (this.chainChangeHandler) {
      this.okxWallet.removeListener('chainChanged', this.chainChangeHandler);
    }
    if (this.accountsChangedHandler) {
      this.okxWallet.removeListener('accountsChanged', this.accountsChangedHandler);
    }
    this.chainChangeHandler = null;
    this.accountsChangedHandler = null;
  }


  requestAccountsAddress(): Promise<string[]> {
    return this.okxWallet.requestAccounts();
  }

  requestBalance(address?: string): Promise<string> {
    if (!address) {
      address = this.okxWallet.selectedAddress;
    }
    return this.okxWallet.request({
      method: 'eth_getBalance',
      params: [address, 'latest']
    });
  }

  requestChainId(): Promise<string> {
    return this.okxWallet.request({
      method: 'eth_chainId',
      params: []
    });
  }

  requestBlockNumber(): Promise<number> {
    return this.okxWallet.request({
      method: 'eth_blockNumber',
      params: []
    });
  }

  requestGasPrice(): Promise<string> {
    return this.okxWallet.request({
      method: 'eth_gasPrice',
      params: []
    });
  }

  async requestWalletInfo(): Promise<(IWalletAccount & INetworkInfo & { custom: boolean, isConnected: boolean }) | null> {
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
        selectedAddress: this.okxWallet.selectedAddress,
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

    
  async sendTransaction(params: ITransactionFields): Promise<string | null> {
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

  async waitForTransactionReceipt(txHash: string): Promise<any> {
    const receipt = await this.provider.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash]
    })
    return receipt;
  }

  constructor(private readonly provider: any) {
    super();

    if (!provider.isOkxWallet) {
      throw new Error('provider is not OkxWallet');
    }
    this.okxWallet = provider;
  }
  
    
}