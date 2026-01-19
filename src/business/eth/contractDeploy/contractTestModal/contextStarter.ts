import { useWalletContext } from "../../transaction/WalletContext";
import { useEffect } from "react";
import { getInstalledProvider } from "@/src/utils/ethereum/metamask";

interface IContextStarterProps {
    modalStatus: boolean;
}

export default function ContextStarter(props: IContextStarterProps) {
    const { switchRdns, refreshWalletInfo, accountInfo } = useWalletContext();

    useEffect(() => {
        let providers = getInstalledProvider();
        if (providers.length === 1) {
            switchRdns(providers[0].info.rdns);
        }

        refreshWalletInfo();
    }, []);

    useEffect(() => {
        if (props.modalStatus === true) {
            refreshWalletInfo();
        }
    }, [props.modalStatus]);

    return null;
}