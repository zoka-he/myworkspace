import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { IWalletInfo } from './IWalletInfo';
import { INetworkInfo, IProviderInfo, IWalletAccount } from '@/src/utils/ethereum/metamask';
import { MetamaskTool, isConnected } from '@/src/utils/ethereum/metamask';
import { getInstalledProvider } from '@/src/utils/ethereum';
import { WalletTool } from '@/src/utils/ethereum/WalletTools';

declare type WalletContextType = {
    providerInfo: IProviderInfo | null;
    walletProvider: any;
    isWalletConnected: boolean;
    switchRdns: (rdns: string | null) => void;
    getWalletProvider: () => any;
    getWalletTool: () => WalletTool | null;
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
    const walletToolRef = useRef<WalletTool | null>(null);

    // 使用 useMemo 缓存 isWalletConnected，依赖于 providerInfo 和 accountInfo
    // 当 provider 或账户变化时，连接状态可能会变化
    // 使用 accountInfo?.selectedAddress 来判断是否连接，这是同步的且可靠的
    const isWalletConnected = useMemo(() => {
        return walletProviderRef.current ? isConnected(walletProviderRef.current) : false;
    }, [providerInfo, accountInfo?.selectedAddress]);



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
            console.debug('switchRdns provider not found', rdns);
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

    // 刷新钱包信息
    const refreshWalletInfo = useCallback(async () => {
        console.debug('walletContext刷新钱包信息');

        if (!walletToolRef.current) {
            setAccountInfo((prev) => {
                if (prev !== null) {
                    return null;
                }
                return prev;
            });
            setNetworkInfo((prev) => {
                if (prev !== null) {
                    return null;
                }
                return prev;
            });
            console.error('执行异常：walletToolRef为空');
            return;
        }

        const walletInfo = await walletToolRef.current?.requestWalletInfo();
        if (walletInfo) {
            setAccountInfo((prev) => {
                const newAccountInfo = {
                    accounts: walletInfo.accounts,
                    selectedAddress: walletInfo.selectedAddress,
                    balance: walletInfo.balance,
                };
                // 只有当数据真正变化时才更新状态
                if (prev && 
                    JSON.stringify(prev.accounts) === JSON.stringify(newAccountInfo.accounts) &&
                    prev.selectedAddress === newAccountInfo.selectedAddress &&
                    prev.balance === newAccountInfo.balance) {
                    return prev;
                }
                return newAccountInfo;
            });
            setNetworkInfo((prev) => {
                const newNetworkInfo = {
                    chainId: walletInfo.chainId,
                    blockNumber: walletInfo.blockNumber,
                    gasPrice: walletInfo.gasPrice,
                };
                // 只有当数据真正变化时才更新状态
                if (prev &&
                    prev.chainId === newNetworkInfo.chainId &&
                    prev.blockNumber === newNetworkInfo.blockNumber &&
                    prev.gasPrice === newNetworkInfo.gasPrice) {
                    return prev;
                }
                return newNetworkInfo;
            });
        } else {
            setAccountInfo((prev) => {
                if (prev !== null) {
                    return null;
                }
                return prev;
            });
            setNetworkInfo((prev) => {
                if (prev !== null) {
                    return null;
                }
                return prev;
            });
            console.error('刷新钱包信息失败');
        }
    }, []);

    const createWalletTool = useCallback(() => {
        // 移除旧的监听
        if (walletToolRef.current) {
            walletToolRef.current.offAllListeners();
        }

        // 创建新的监听
        if (walletProviderRef.current) {
            walletToolRef.current = WalletTool.from(walletProviderRef.current);
            walletToolRef.current.onChainChanged((chainId) => {
                console.debug('network发生变化导致钱包信息需要更新');
                refreshWalletInfo();
            });
            walletToolRef.current.onAccountsChanged((accounts) => {
                console.debug('accounts发生变化导致钱包信息需要更新');
                refreshWalletInfo();
            });
        } else {
            walletToolRef.current = null;
            console.debug('provider未设置，未完成初始化');
        }
    }, [refreshWalletInfo]);

    // 监听钱包提供者变化
    useEffect(() => {
        console.debug('provider发生变化导致MetamaskTool需要更新');

        createWalletTool();
    }, [providerInfo, createWalletTool]);

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
    }, [providerInfo, isWalletConnected, switchRdns, getWalletProvider, getWalletTool, accountInfo, networkInfo, refreshWalletInfo]);

    // console.debug('sharedState changed:', sharedState);
    return <WalletContext.Provider value={sharedState}>{children}</WalletContext.Provider>;
}

export const useWalletContext = () => {
    return useContext(WalletContext);
}