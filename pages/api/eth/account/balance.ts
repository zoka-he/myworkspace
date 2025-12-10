import { NextApiRequest, NextApiResponse } from "next";
import { AddressLike, ethers } from 'ethers';
import EthNetworkService from '@/src/services/eth/ethNetworkService';
import { ISqlCondMap } from "@/src/utils/mysql/types";

const ethNetworkService = new EthNetworkService();

async function getBalance(req: NextApiRequest, res: NextApiResponse) {
    let { address, network_id } = req.query;

    if (!address || !network_id) {
        return res.status(400).json({ message: '缺少地址或网络ID' });
    }

    if (address && typeof address === 'string' && !address.startsWith('0x')) {
        address = '0x' + address;
    }

    if (address && typeof address === 'string' && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ message: '无效的以太坊地址格式' });
    }

    const network = await ethNetworkService.queryOne({ id: network_id } as ISqlCondMap);
    if (!network || !network.rpc_url) {
        if (process.env.NODE_ENV === 'development') {
            if (!network) {
                console.debug('数据库中不存在id=' + network_id + '的网络');
            } else if (!network.rpc_url) {
                console.debug('数据库中id=' + network_id + '的网络的RPC地址未设置');
            }
        }
        return res.status(400).json({ message: '网络不存在或RPC地址不存在' });
    }

    // const provider = new ethers.JsonRpcProvider(network.rpc_url);
    let provider;
    switch (network.vendor) {
        case 'etherscan':
            provider = new ethers.EtherscanProvider(network.chain_id, process.env.ETHERSCAN_API_KEY);
            break;
        default:
            if (!network.rpc_url) {
                return res.status(400).json({ message: 'RPC地址无法访问' });
            }
            provider = new ethers.JsonRpcProvider(network.rpc_url);
            break;
    }

    const balance = await provider.getBalance(address as AddressLike);
    // provider.off();
    provider.destroy();

    console.debug(balance);
    res.status(200).json({ message: '获取余额成功', balance: ethers.formatEther(balance) });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET':
                return await getBalance(req, res);
            default:
                res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
                res.status(405).end(`Method ${method} Not Allowed`);
        }
    } catch (error: any) {
        console.error('API Error:', error);
        res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
}