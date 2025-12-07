import fetch from '@/src/fetch';

const defaultApiKey = 'NHA2XREMZYNWJTA8KATB2JTSTVATTZH8Z8';

export default class EtherscanUtil {
    // static getEtherscanUrl(chainId: string) {
    //     return `https://etherscan.io/address/${address}`;
    // }

    public static ChainId = Object.freeze({
        MAINNET: 1,
        SEPOLIA: 11155111,
        GOERLI: 5,
        POLYGON: 137,
        POLYGON_MUMBAI: 80001,
        BSC: 56,
    })

    public static EndPointUrl = Object.freeze({
        MAINNET: 'https://api.etherscan.io/v2/api',
        SEPOLIA: 'https://api-sepolia.etherscan.io/api',
        GOERLI: 'https://api-goerli.etherscan.io/api',
        POLYGON: 'https://api.polygonscan.com/api',
        POLYGON_MUMBAI: 'https://api-mumbai.polygonscan.com/api',
        BSC: 'https://api.bscscan.com/api',
    })

    constructor(
        private readonly endpoint: string, 
        private readonly chainId: number, 
        private readonly apiKey: string = defaultApiKey
    ) {
    }

    private checkAddress(address: string) {
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            throw new Error('Invalid address');
        }
    }

    async getBalance(address: string) {
        this.checkAddress(address);
    }

    async getTxCount(address: string) {
        this.checkAddress(address);
    }

    async getTxList(address: string, startBlock: number, endBlock: number | 'latest', page: number, limit: number) {
        this.checkAddress(address);

        if (startBlock < 0) {
            throw new Error('Start block must be greater than 0');
        }

        if (endBlock !== 'latest' && endBlock < 0) {
            throw new Error('End block must be greater than 0');
        }
        
        if (endBlock !== 'latest' && endBlock < startBlock) {
            throw new Error('End block must be greater than start block');
        }

        if (page < 1) {
            throw new Error('Page must be greater than 0');
        }
        
        if (limit < 1) {
            throw new Error('Limit must be greater than 0');
        }

        if (limit > 100) {
            throw new Error('Limit must be less than 100');
        }
        
        const response = await fetch.get(this.endpoint, {
            params: {
                apikey: this.apiKey,
                chainid: this.chainId.toString(),
                module: 'account',
                action: 'txlist',
                address: address,
                startblock: startBlock.toString(),
                endblock: endBlock.toString(),    
                page: page.toString(),
                offset: limit.toString(),
                sort: 'desc'
            }
        });

        if (response.status != 1) {
            throw new Error(response.message || 'Failed to get tx list');
        }

        return response.result;
    }

    private static bigint_divide_2_float(value: bigint | string, divisor_log: number, decimals = -1) : number {
        if (typeof value === 'string') {
            value = BigInt(value);
        }

        if (divisor_log < 0) {
            throw new Error('Divisor log must be greater than 0');
        }

        const divisor = BigInt(10 ** divisor_log);
        const integer = value / divisor;
        const fraction = value % divisor;
        
        
        if (fraction === BigInt(0)) {
            return parseInt(integer.toString());
        }
        
        const fractionStr = fraction.toString().padStart(divisor_log, '0');
        // console.debug('fractionStr is', fractionStr);

        let trimmed = '';
        if (decimals < 0) {
            trimmed = fractionStr.replace(/0+$/, '');
        } else if (decimals > 0) {
            trimmed = fractionStr.slice(0, decimals).replace(/0+$/, '');
        }

        if (!trimmed) {
            return parseInt(`${integer.toString()}`);
        } else {
            return parseFloat(`${integer.toString()}.${trimmed.toString()}`);
        }
        
    }

    public static wei2eth(wei: string | bigint, decimals = 6) : number {
        return this.bigint_divide_2_float(wei, 18, decimals);
    }

    public static wei2gwei(wei: string | bigint, decimals = 6) : number {
        return this.bigint_divide_2_float(wei, 9, decimals);
    }
}