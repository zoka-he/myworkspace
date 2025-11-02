import { WalletInfo } from "@/src/utils/ethereum/metamask";

export interface IWalletInfo extends WalletInfo {
    networkId?: number;
    privateKey?: string;
    rpcUrl?: string;
}