import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { IWalletInfo } from './IWalletInfo';
import { getInstalledProvider, INetworkInfo, IProviderInfo, IWalletAccount } from '@/src/utils/ethereum/metamask';
import { MetamaskTool, isConnected } from '@/src/utils/ethereum/metamask';

declare type WalletContextType = {
    providerInfo: IProviderInfo | null;
    walletProvider: any;
    isWalletConnected: boolean;
    switchRdns: (rdns: string | null) => void;
    getWalletProvider: () => any;
    getWalletTool: () => MetamaskTool | null;
    accountInfo: any;
    networkInfo: any;
    refreshWalletInfo: () => Promise<void>;
}

export const WalletContext = createContext<WalletContextType>({
    providerInfo: null,
    walletProvider: null,
    isWalletConnected: false,
    switchRdns: () => {},
    getWalletProvider: () => null,
    getWalletTool: () => null,
    accountInfo: null,
    networkInfo: null,
    refreshWalletInfo: () => Promise.resolve(),
});

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
    const [providerInfo, setWalletInfo] = useState<IProviderInfo | null>(null);
    const [accountInfo, setAccountInfo] = useState<IWalletAccount | null>(null);
    const [networkInfo, setNetworkInfo] = useState<INetworkInfo | null>(null);

    const walletProviderRef = useRef<any>(null);
    const walletToolRef = useRef<MetamaskTool | null>(null);

    const isWalletConnected = isConnected(walletProviderRef.current);

    useEffect(() => {
        return () => {
            // 移除所有监听
            if (walletToolRef.current) {
                walletToolRef.current.offAllListeners();
            }
        }
    }, [])

    const switchRdns = useCallback((rdns: string | null) => {
        if (!rdns) {
            setWalletInfo(null);
            walletProviderRef.current = null;
            return;
        }

        let infoAndProvider = getInstalledProvider().find(({info}) => info.rdns === rdns);
        if (infoAndProvider) {
            setWalletInfo(infoAndProvider.info);
            walletProviderRef.current = infoAndProvider.provider;
        } else {
            setWalletInfo(null);
            walletProviderRef.current = null;
        }
    }, []);

    const getWalletProvider = useCallback(() => {
        return walletProviderRef.current;
    }, []);

    const getWalletTool = useCallback(() => {
        return walletToolRef.current;
    }, []);

    // 监听钱包提供者变化
    useEffect(() => {
        console.debug('provider发生变化导致MetamaskTool需要更新');

        // 移除旧的监听
        if (walletToolRef.current) {
            walletToolRef.current.offAllListeners();
        }

        // 创建新的监听
        if (walletProviderRef.current) {
            let tool = new MetamaskTool(walletProviderRef.current);
            tool.onChainChanged((chainId) => {
                console.debug('network发生变化导致钱包信息需要更新');
                refreshWalletInfo();
            });
            tool.onAccountsChanged((accounts) => {
                console.debug('accounts发生变化导致钱包信息需要更新');
                refreshWalletInfo();
            });
            walletToolRef.current = new MetamaskTool(walletProviderRef.current);
        } else {
            walletToolRef.current = null;
        }
    }, [walletProviderRef.current]);

    // 刷新钱包信息
    async function refreshWalletInfo() {
        const walletInfo = await getWalletTool()?.requestWalletInfo();
        if (walletInfo) {
            setAccountInfo({
                accounts: walletInfo.accounts,
                selectedAddress: walletInfo.selectedAddress,
                balance: walletInfo.balance,
            });
            setNetworkInfo({
                chainId: walletInfo.chainId,
                blockNumber: walletInfo.blockNumber,
                gasPrice: walletInfo.gasPrice,
            });
        }
    }

    const sharedState = useMemo(() => {
        return {
            providerInfo: providerInfo,
            walletProvider: walletProviderRef.current,
            isWalletConnected,
            switchRdns,
            getWalletProvider,
            getWalletTool,
            accountInfo,
            networkInfo,
            refreshWalletInfo,
        }
    }, [providerInfo, walletProviderRef.current, isWalletConnected, accountInfo, networkInfo]);

    console.debug('sharedState changed:', sharedState);
    return <WalletContext.Provider value={sharedState}>{children}</WalletContext.Provider>;
}

export const useWalletContext = () => {
    return useContext(WalletContext);
}