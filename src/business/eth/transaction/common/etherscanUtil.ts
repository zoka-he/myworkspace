import fetch from '@/src/fetch';
import * as EtherConvertUtil from './etherConvertUtil';

const defaultApiKey = process.env.ETHERSCAN_API_KEY;

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

    private checkContractAddress(contractAddress: string) {
        if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
            throw new Error('Invalid contract address');
        }
    }

    private checkBlockRange(startblock: number, endblock: number | 'latest') {
        if (startblock < 0) {
            throw new Error('Start block must be greater than 0');
        }

        if (endblock !== 'latest' && endblock < 0) {
            throw new Error('End block must be greater than 0');
        }

        if (endblock !== 'latest' && endblock < startblock) {
            throw new Error('End block must be greater than start block');
        }
    }

    private checkPageAndLimit(page: number, limit: number) {
        if (page < 1) {
            throw new Error('Page must be greater than 0');
        }

        if (limit < 1) {
            throw new Error('Limit must be greater than 0');
        }

        if (limit > 100) {
            throw new Error('Limit must be less than 100');
        }
    }

    async getBalance(address: string) {
        this.checkAddress(address);
    }

    async getTxCount(address: string) {
        this.checkAddress(address);
    }

    async getNftList(address: string, contractAddress: string, startblock: number, endblock: number | 'latest', page: number, limit: number) {
        this.checkAddress(address);
        this.checkBlockRange(startblock, endblock);
        this.checkPageAndLimit(page, limit);

        let params: any = {
            apikey: this.apiKey,
            chainid: this.chainId.toString(),
            module: 'account',
            action: 'tokennfttx',
            address: address,
            startblock: startblock.toString(),
            endblock: endblock.toString(),
            page: page.toString(),
            offset: limit.toString(),
            sort: 'desc'
        }

        if (contractAddress.length > 0) {
            this.checkContractAddress(contractAddress);
            params.contractaddress = contractAddress;
        }

        

        const response = await fetch.get(this.endpoint, {
            params: params
        });

        if (response.status != 1) {
            throw new Error(response.message || 'Failed to get nft list');
        }

        return response.result;
    }

    async getTxList(address: string, startBlock: number, endBlock: number | 'latest', page: number, limit: number) {
        this.checkAddress(address);
        this.checkBlockRange(startBlock, endBlock);
        this.checkPageAndLimit(page, limit);
        
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
    
    public static wei2eth(wei: string | bigint, decimals = 6) : number {
        return EtherConvertUtil.bigint_divide_2_float(wei, 18, decimals);
    }

    public static wei2gwei(wei: string | bigint, decimals = 6) : number {
        return EtherConvertUtil.bigint_divide_2_float(wei, 9, decimals);
    }
}