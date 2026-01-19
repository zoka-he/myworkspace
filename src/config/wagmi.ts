import { createConfig, http } from "@wagmi/core";
import { mainnet, sepolia } from "@wagmi/core/chains";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
    chains: [mainnet, sepolia],
    // connectors: [injected()],
    transports: {
        [mainnet.id]: http(),
        [sepolia.id]: http(`https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`),
    },
});