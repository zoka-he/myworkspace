import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import EthNetworkService from '@/src/services/eth/ethNetworkService';
import { ISqlCondMap } from '@/src/types/IMysqlActions';

const ethNetworkService = new EthNetworkService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET':
                return await getTransactions(req, res);
            default:
                res.setHeader('Allow', ['GET']);
                res.status(405).end(`Method ${method} Not Allowed`);
        }
    } catch (error: any) {
        console.error('API Error:', error);
        res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
}

async function getTransactions(req: NextApiRequest, res: NextApiResponse) {
    const { address, network_id, page = 1, limit = 20, start_block = 0, end_block = 'latest' } = req.query;

    if (!address || !network_id) {
        return res.status(400).json({ message: '缺少地址或网络ID' });
    }

    // 验证地址格式
    if (typeof address === 'string' && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        if (process.env.NODE_ENV === 'development') {
            console.debug('无效的以太坊地址格式: ' + address);
            console.debug('地址长度：' + address.length);
        }
        return res.status(400).json({ message: '无效的以太坊地址格式' });
    }

    try {
        // 获取网络配置
        const network = await ethNetworkService.queryOne({ id: network_id } as ISqlCondMap);
        if (!network || !network.rpc_url) {
            return res.status(400).json({ message: '网络不存在或RPC地址不存在' });
        }

        // 创建 provider
        let provider;
        switch (network.vendor) {
            case 'etherscan':
                // 根据 chain_id 确定正确的网络名称
                let networkName;
                switch (network.chain_id) {
                    case 1:
                        networkName = 'homestead'; // 主网
                        break;
                    case 5:
                        networkName = 'goerli'; // Goerli 测试网
                        break;
                    case 11155111:
                        networkName = 'sepolia'; // Sepolia 测试网
                        break;
                    case 137:
                        networkName = 'matic'; // Polygon 主网
                        break;
                    case 80001:
                        networkName = 'maticmum'; // Polygon Mumbai 测试网
                        break;
                    case 56:
                        networkName = 'bsc'; // BSC 主网
                        break;
                    case 97:
                        networkName = 'bsc-testnet'; // BSC 测试网
                        break;
                    case 42161:
                        networkName = 'arbitrum'; // Arbitrum 主网
                        break;
                    case 421613:
                        networkName = 'arbitrum-goerli'; // Arbitrum Goerli 测试网
                        break;
                    case 10:
                        networkName = 'optimism'; // Optimism 主网
                        break;
                    case 420:
                        networkName = 'optimism-goerli'; // Optimism Goerli 测试网
                        break;
                    default:
                        networkName = 'homestead'; // 默认主网
                        break;
                }
                
                if (process.env.NODE_ENV === 'development') {
                    console.debug('创建 EtherscanProvider:', { 
                        chain_id: network.chain_id, 
                        network_name: networkName,
                        vendor: network.vendor 
                    });
                }
                
                provider = new ethers.EtherscanProvider(networkName, 'NHA2XREMZYNWJTA8KATB2JTSTVATTZH8Z8');
                break;
            default:
                provider = new ethers.JsonRpcProvider(network.rpc_url);
                break;
        }

        // 获取交易历史
        const transactions = await getTransactionHistory(
            provider, 
            address as string, 
            Number(start_block), 
            end_block as string,
            Number(page),
            Number(limit)
        );

        // 获取总交易数（用于分页）
        const totalCount = await getTransactionCount(provider, address as string);

        provider.destroy();

        res.status(200).json({
            data: transactions,
            count: totalCount,
            page: Number(page),
            limit: Number(limit),
            network: {
                name: network.name,
                chain_id: network.chain_id,
                unit: network.unit
            }
        });

    } catch (error: any) {
        console.error('获取交易历史失败:', error);
        res.status(500).json({ 
            message: '获取交易历史失败', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    }
}

// 获取交易历史
async function getTransactionHistory(
    provider: ethers.Provider, 
    address: string, 
    startBlock: number, 
    endBlock: string,
    page: number,
    limit: number
) {
    try {
        // 获取当前区块号
        const currentBlock = await provider.getBlockNumber();
        const actualEndBlock = endBlock === 'latest' ? currentBlock : Number(endBlock);
        
        // 计算查询范围
        const blockRange = Math.max(1000, actualEndBlock - startBlock); // 至少查询1000个区块
        const blocksPerPage = Math.ceil(blockRange / limit);
        const startBlockForPage = Math.max(startBlock, actualEndBlock - (page * blocksPerPage));
        const endBlockForPage = Math.min(actualEndBlock, startBlockForPage + blocksPerPage);

        // 获取交易历史（使用 Etherscan API 或自定义实现）
        if (provider instanceof ethers.EtherscanProvider) {
            return await getTransactionsFromEtherscan(provider, address, page, limit);
        } else {
            return await getTransactionsFromRPC(provider, address, startBlockForPage, endBlockForPage);
        }
    } catch (error) {
        console.error('获取交易历史失败:', error);
        return [];
    }
}

// 从 Etherscan 获取交易
async function getTransactionsFromEtherscan(provider: ethers.EtherscanProvider, address: string, page: number, limit: number) {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.debug('EtherscanProvider 网络:', provider.network);
            console.debug('EtherscanProvider API Key:', provider.apiKey);
            console.debug('请求参数:', { address, page, limit });
        }

        // 使用 Etherscan API 的 txlist 端点获取交易历史
        const response = await provider.fetch('account', {
            action: 'txlist',
            address: address,
            startblock: '0',
            endblock: '99999999',
            page: page.toString(),
            offset: limit.toString(),
            sort: 'desc'
        });

        if (process.env.NODE_ENV === 'development') {
            console.debug('txlist response:', response);
            console.debug('response status:', response.status);
            console.debug('response message:', response.message);
            console.debug('result length:', response.result?.length);
        }

        // TODO: 此处逻辑可能存在问题
        if (response.status !== '1') {
            const error = new Error(response.message || 'provider.fetch 读取txlist出现未知错误');
            (error as any).response = response;
            throw error;
        }

        const transactions = response.result || [];

        if (process.env.NODE_ENV === 'development') {
            console.debug('解析后的交易数量:', transactions.length);
            if (transactions.length > 0) {
                console.debug('第一个交易示例:', transactions[0]);
            }
        }

        // 转换为统一格式
        return transactions.map((tx: any, index: number) => ({
            id: `${tx.hash}-${index}`,
            hash: tx.hash,
            from: tx.from,
            to: tx.to || '',
            value: ethers.formatEther(tx.value || '0'),
            fee: tx.gasPrice && tx.gasUsed ? 
                ethers.formatEther(BigInt(tx.gasPrice) * BigInt(tx.gasUsed)) : '0',
            status: tx.isError === '0' ? 'success' : 'failed',
            type: tx.from.toLowerCase() === address.toLowerCase() ? 'send' : 'receive',
            timestamp: parseInt(tx.timeStamp) * 1000, // 转换为毫秒
            blockNumber: parseInt(tx.blockNumber),
            gasUsed: tx.gasUsed || '0',
            gasPrice: tx.gasPrice || '0',
            confirmations: 0, // Etherscan API 不直接提供确认数
            nonce: tx.nonce,
            data: tx.input
        }));
    } catch (error: any) {
        console.error('Etherscan API 错误:', error?.code, error?.message);
        console.error('response:', error?.response);
        return [];
    }
}

// 从 RPC 获取交易（简化实现）
async function getTransactionsFromRPC(provider: ethers.Provider, address: string, startBlock: number, endBlock: number) {
    try {
        const transactions = [];
        
        // 简化实现：只获取最近的几个区块
        const currentBlock = await provider.getBlockNumber();
        const searchBlocks = Math.min(100, currentBlock - startBlock);
        
        for (let i = 0; i < searchBlocks && transactions.length < 50; i++) {
            try {
                const blockNumber = currentBlock - i;
                const block = await provider.getBlock(blockNumber, true);
                
                if (block && block.transactions) {
                    for (const tx of block.transactions) {
                        if (typeof tx === 'object' && 'from' in tx && (tx as any).from && 
                            ((tx as any).from.toLowerCase() === address.toLowerCase() || 
                             ('to' in tx && (tx as any).to && (tx as any).to.toLowerCase() === address.toLowerCase()))) {
                            
                            const txObj = tx as any; // 类型断言
                            transactions.push({
                                id: `${txObj.hash}-${blockNumber}`,
                                hash: txObj.hash,
                                from: txObj.from,
                                to: txObj.to || '',
                                value: ethers.formatEther(txObj.value || '0'),
                                fee: txObj.gasPrice && txObj.gasLimit ? 
                                    ethers.formatEther(BigInt(txObj.gasPrice) * BigInt(txObj.gasLimit)) : '0',
                                status: 'success',
                                type: txObj.from.toLowerCase() === address.toLowerCase() ? 'send' : 'receive',
                                timestamp: block.timestamp * 1000,
                                blockNumber: blockNumber,
                                gasUsed: txObj.gasLimit?.toString() || '0',
                                gasPrice: txObj.gasPrice?.toString() || '0',
                                confirmations: currentBlock - blockNumber,
                                nonce: txObj.nonce,
                                data: txObj.data
                            });
                        }
                    }
                }
            } catch (blockError) {
                console.warn(`获取区块 ${currentBlock - i} 失败:`, blockError);
            }
        }
        
        return transactions;
    } catch (error) {
        console.error('RPC 获取交易失败:', error);
        return [];
    }
}

// 获取交易总数
async function getTransactionCount(provider: ethers.Provider, address: string): Promise<number> {
    try {
        if (provider instanceof ethers.EtherscanProvider) {
            // 使用 Etherscan API 获取交易总数
            const response = await provider.fetch('account', {
                action: 'txlist',
                address: address,
                startblock: '0',
                endblock: '99999999',
                page: '1',
                offset: '1',
                sort: 'desc'
            });

            if (response.status === '1') {
                // 从响应中获取总数，如果 API 支持的话
                // 注意：Etherscan API 可能不直接返回总数，这里返回一个估算值
                return response.result ? response.result.length : 0;
            }
            return 0;
        } else {
            // 简化实现：返回固定值
            return 0;
        }
    } catch (error) {
        console.error('获取交易总数失败:', error);
        return 0;
    }
}
