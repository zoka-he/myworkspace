import { NextApiRequest, NextApiResponse } from 'next';
// import mysql from '@/src/utils/mysql/server';
import EthAccountService from '@/src/services/eth/ethAccountService';
import _ from 'lodash';
import { ISqlCondMap } from '@/src/types/IMysqlActions';

const ethAccountService = new EthAccountService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET':
                return await getAccounts(req, res);
            case 'POST':
                return await createAccount(req, res);
            case 'PUT':
                return await updateAccount(req, res);
            case 'DELETE':
                return await deleteAccount(req, res);
            default:
                res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
                res.status(405).end(`Method ${method} Not Allowed`);
        }
    } catch (error: any) {
        console.error('API Error:', error);
        res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
}

async function getAccounts(req: NextApiRequest, res: NextApiResponse) {
    const page = _.toNumber(req.query.page || 1);
    const limit = _.toNumber(req.query.limit || 20);
    const name = req.query.name as string;
    const chain_id = _.toNumber(req.query.chain_id || 0);
    const address = req.query.address as string;
    const network = req.query.network as string;
    
    // 获取数据、总数
    const { data, count } = await ethAccountService.getAccountsAndBalances(name, address, network, chain_id, page, limit);
    
    res.status(200).json({
        data: data,
        count: count,
        page: Number(page),
        limit: Number(limit)
    });
}

async function createAccount(req: NextApiRequest, res: NextApiResponse) {
    const { name, address, private_key, balance, network_id, remark } = req.body;
    
    // 验证必填字段
    if (!name || !address || !network_id) {
        return res.status(400).json({ message: '缺少必填字段' });
    }
    
    // 验证地址格式
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ message: '无效的以太坊地址格式' });
    }
    
    // 验证私钥格式（如果提供）
    if (private_key && !/^(0x)?[a-fA-F0-9]{64}$/.test(private_key)) {
        return res.status(400).json({ message: '无效的私钥格式' });
    }
    
    const result = await ethAccountService.insertOne({
        name, address, private_key, balance, network_id, remark
    });
    
    res.status(201).json({
        message: '账户创建成功',
    });
}

async function updateAccount(req: NextApiRequest, res: NextApiResponse) {
    const { id, name, address, private_key, network_id, remark } = req.body;
    
    if (!id) {
        return res.status(400).json({ message: '缺少账户ID' });
    }
    
    // 验证地址格式
    if (address && !/^(0x)?[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ message: '无效的以太坊地址格式' });
    }
    
    // 验证私钥格式（如果提供）
    if (private_key && !/^(0x)?[a-fA-F0-9]{64}$/.test(private_key)) {
        return res.status(400).json({ message: '无效的私钥格式' });
    }

    await ethAccountService.updateOne({ id }, { name, address, private_key, network_id, remark });
    
    res.status(200).json({ message: '账户更新成功' });
}

async function deleteAccount(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    
    if (!id) {
        return res.status(400).json({ message: '缺少账户ID' });
    }
    
    const query = 'DELETE FROM eth_accounts WHERE id = ?';
    await mysql.execute(query, [id]);
    
    res.status(200).json({ message: '账户删除成功' });
}
