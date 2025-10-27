import { NextApiRequest, NextApiResponse } from 'next';
import mysql from '@/src/utils/mysql/server';
import EthNetworkService from '@/src/services/eth/ethNetworkService';
import _ from 'lodash';
import { ISqlCondMap } from '@/src/types/IMysqlActions';

const ethNetworkService = new EthNetworkService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET':
                return await getNetworks(req, res);
            case 'POST':
                return await createNetwork(req, res);
            case 'PUT':
                return await updateNetwork(req, res);
            case 'DELETE':
                return await deleteNetwork(req, res);
            default:
                res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
                res.status(405).end(`Method ${method} Not Allowed`);
        }
    } catch (error: any) {
        console.error('API Error:', error);
        res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
}

async function getNetworks(req: NextApiRequest, res: NextApiResponse) {
    const { name, chainId, isTestnet } = req.query;
    
    const page = _.toNumber(req.query.page || 1);
    const limit = _.toNumber(req.query.limit || 20);

    let queryObject: ISqlCondMap = {};

    if (name) {
        queryObject.name = { $like: `%${name}%` };
    }
    if (chainId) {
        queryObject.chain_id = chainId;
    }
    if (isTestnet !== undefined) {
        queryObject.is_testnet = isTestnet === 'true' ? 1 : 0;
    }
    
    let ret = await ethNetworkService.query(queryObject, [], ['create_time asc'], page, limit);
    
    res.status(200).json({
        data: ret.data,
        count: ret.count,
        page: Number(page),
        limit: Number(limit)
    });
}

async function createNetwork(req: NextApiRequest, res: NextApiResponse) {
    const { name, chainId, rpcUrl, explorerUrl, isTestnet } = req.body;
    
    // 验证必填字段
    if (!name || !chainId || !rpcUrl || !explorerUrl) {
        return res.status(400).json({ message: '缺少必填字段' });
    }
    
    // 验证链ID格式
    if (!Number.isInteger(chainId) || chainId <= 0) {
        return res.status(400).json({ message: '链ID必须是正整数' });
    }
    
    // 验证URL格式
    try {
        new URL(rpcUrl);
        new URL(explorerUrl);
    } catch (error) {
        return res.status(400).json({ message: '请输入有效的URL格式' });
    }
    
    // 检查链ID是否已存在
    const checkQuery = 'SELECT id FROM eth_networks WHERE chain_id = ?';
    const [existing] = await mysql.execute(checkQuery, [chainId]);
    
    if ((existing as any[]).length > 0) {
        return res.status(400).json({ message: '该链ID已存在' });
    }
    
    const query = `
        INSERT INTO eth_networks (name, chain_id, rpc_url, explorer_url, is_testnet, create_time, update_time)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const [result] = await mysql.execute(query, [
        name, 
        chainId, 
        rpcUrl, 
        explorerUrl, 
        isTestnet ? 1 : 0
    ]);
    
    res.status(201).json({
        message: '网络创建成功',
        id: (result as any).insertId
    });
}

async function updateNetwork(req: NextApiRequest, res: NextApiResponse) {
    const { id, name, chainId, rpcUrl, explorerUrl, isTestnet } = req.body;
    
    if (!id) {
        return res.status(400).json({ message: '缺少网络ID' });
    }
    
    // 验证链ID格式
    if (chainId && (!Number.isInteger(chainId) || chainId <= 0)) {
        return res.status(400).json({ message: '链ID必须是正整数' });
    }
    
    // 验证URL格式
    if (rpcUrl) {
        try {
            new URL(rpcUrl);
        } catch (error) {
            return res.status(400).json({ message: 'RPC URL格式无效' });
        }
    }
    
    if (explorerUrl) {
        try {
            new URL(explorerUrl);
        } catch (error) {
            return res.status(400).json({ message: '浏览器URL格式无效' });
        }
    }
    
    // 检查链ID是否已被其他网络使用
    if (chainId) {
        const checkQuery = 'SELECT id FROM eth_networks WHERE chain_id = ? AND id != ?';
        const [existing] = await mysql.execute(checkQuery, [chainId, id]);
        
        if ((existing as any[]).length > 0) {
            return res.status(400).json({ message: '该链ID已被其他网络使用' });
        }
    }
    
    const query = `
        UPDATE eth_networks 
        SET name = ?, chain_id = ?, rpc_url = ?, explorer_url = ?, is_testnet = ?, update_time = NOW()
        WHERE id = ?
    `;
    
    await mysql.execute(query, [
        name, 
        chainId, 
        rpcUrl, 
        explorerUrl, 
        isTestnet ? 1 : 0,
        id
    ]);
    
    res.status(200).json({ message: '网络更新成功' });
}

async function deleteNetwork(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    
    if (!id) {
        return res.status(400).json({ message: '缺少网络ID' });
    }
    
    // 检查是否有账户使用此网络
    const checkQuery = 'SELECT COUNT(*) as count FROM eth_accounts WHERE network = (SELECT name FROM eth_networks WHERE id = ?)';
    const [checkResult] = await mysql.execute(checkQuery, [id]);
    const accountCount = (checkResult as any[])[0].count;
    
    if (accountCount > 0) {
        return res.status(400).json({ 
            message: `无法删除此网络，还有 ${accountCount} 个账户正在使用此网络` 
        });
    }
    
    const query = 'DELETE FROM eth_networks WHERE id = ?';
    await mysql.execute(query, [id]);
    
    res.status(200).json({ message: '网络删除成功' });
}
