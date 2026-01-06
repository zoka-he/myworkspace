import { IProviderInfo } from "./metamask";

let G_METAMASK_INSTALLED = false;
let G_METAMASK_FLASK_INSTALLED = false;
let G_OKX_WALLET_INSTALLED = false;
let G_PROVIDERS = new Map<string, { provider: any, info: IProviderInfo }>();
let G_DETECTION_STARTED = false; // 标记是否已经启动检测

export function startDetectBrowserWalletProvider() {
    if (typeof window === 'undefined') {
      return false;
    }
  

    const eip6963DetextStart = detectEip6963Provider();
    const okxWalletDetextStart = detectOkxWalletProvider();
  
    return eip6963DetextStart || okxWalletDetextStart;
}

function detectEip6963Provider() {
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
}

function detectOkxWalletProvider() {
    if (window?.okxwallet) {
        console.log('使用okxwallet方式检测到Okx钱包');
        G_OKX_WALLET_INSTALLED = true;
        // console.debug('okxwallet', window?.okxwallet);
        G_PROVIDERS.set(
            'okxwallet', 
            { 
                provider: window?.okxwallet, 
                info: { 
                    rdns: 'okxwallet', 
                    name: 'Okx Wallet', 
                    icon: '/imgs/OKX Wallet.ico', 
                    uuid: '' 
                } 
            }
        );
        return true;
    }
    return false;
}

export function hasProviders(): boolean {
    return G_PROVIDERS.size > 0;
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
  
  