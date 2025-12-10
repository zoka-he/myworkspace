import { createContext, useContext, useState } from 'react';
import { IWalletInfo } from './IWalletInfo';

declare type WalletContextType = {
    walletInfo: IWalletInfo | null;
    setWalletInfo: (info: IWalletInfo | null) => void;
}

export const WalletContext = createContext<WalletContextType>({
    walletInfo: null,
    setWalletInfo: () => {}
});

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
    const [walletInfo, setWalletInfo] = useState<IWalletInfo | null>(null);
    return (
        <WalletContext.Provider value={{ walletInfo, setWalletInfo }}>
            {children}
        </WalletContext.Provider>
    )
}

export const useWalletContext = () => {
    const { walletInfo, setWalletInfo } = useContext(WalletContext);
    return { walletInfo, setWalletInfo };
}