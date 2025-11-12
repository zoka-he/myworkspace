import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from '@/src/utils/mysql/server';
import EthContractService from '@/src/services/eth/ethContractService';
import { ISqlCondMap } from '@/src/utils/mysql/types';

const service = new EthContractService();

/**
 * ETH智能合约管理API
 * 
 * GET: 查询合约列表
 * POST: 创建合约记录
 * PUT: 更新合约记录
 * DELETE: 删除合约记录
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET':
                await handleGet(req, res);
                break;
            case 'POST':
                await handlePost(req, res);
                break;
            case 'PUT':
                await handlePut(req, res);
                break;
            case 'DELETE':
                await handleDelete(req, res);
                break;
            default:
                res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error: any) {
        console.error('Contract API Error:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            message: error.message 
        });
    }
}

/**
 * 查询合约列表
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
    const { 
        page = 1, 
        limit = 10, 
        network_id,
        status,
        deployer_account_id,
        address
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // 构建查询条件
    let conditions: ISqlCondMap = {};
    const params: any[] = [];

    if (req.query.name) {
        conditions.name = { $like: `%${req.query.name}%` };
    }

    if (deployer_account_id) {
        conditions.deployer_account_id = deployer_account_id;
    }

    if (network_id) {
        conditions.network_id = network_id;
    }

    if (address) {
        conditions.address = { $like: `%${address}%` };
    }

    if (status) {
        conditions.status = status;
    }

    // 查询数据
    const result: any = await service.query(conditions, [], ['create_time desc'], Number(page), Number(limit));

    res.status(200).json({
        data: result.data,
        count: result.count,
        page: Number(page),
        pageSize: Number(limit)
    });
}

/**
 * 创建合约记录
 */
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
    const {
        name,
        address,
        deployer_account_id,
        network_id,
        abi,
        bytecode,
        source_code,
        status = 'deployed',
    } = req.body;

    // 验证必填字段
    // 对于未部署状态，只需要合约名称和至少一项合约信息（源代码、ABI或bytecode）
    if (status === 'undeployed') {
        if (!name) {
            return res.status(400).json({ 
                error: 'Missing required fields for undeployed contract',
                required: ['name']
            });
        }
        // 至少需要有源代码、ABI或bytecode其中之一
        if (!source_code && !abi && !bytecode) {
            return res.status(400).json({ 
                error: 'At least one of source_code, abi, or bytecode is required',
                required: ['source_code or abi or bytecode']
            });
        }
    } else {
        if (!name || !address || !deployer_account_id || 
            !network_id || !abi || !bytecode) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['name', 'address', 'deployer_address', 'deployer_account_id', 
                          'network_id', 'network', 'chain_id', 'abi', 'bytecode']
            });
        }
    }

    // 检查合约地址是否已存在（仅对有地址的合约检查）
    if (address && network_id) {
        // const checkSql = 'SELECT id FROM eth_contract WHERE address = ? AND network_id = ?';
        const conditions: ISqlCondMap = {
            address: address,
            network_id: network_id
        };
        const existing: any = await service.queryOne(conditions, [], ['create_time desc']);

        if (!!existing) {
            return res.status(400).json({ 
                error: 'Contract already exists',
                message: 'A contract with this address already exists on this network'
            });
        }
    }

    // 插入合约记录
    let updateFields = {...req.body};
    delete updateFields.id;

    try {
        await service.insertOne(updateFields);
        res.status(201).json({
            success: true
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }

    
}

/**
 * 更新合约记录
 */
async function handlePut(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.body;
    const updateFields = {...req.body};
    delete updateFields.id;

    if (!id) {
        return res.status(400).json({ error: 'Contract ID is required' });
    }

    try {
        await service.updateOne({ id }, updateFields);
        res.status(200).json({
            success: true
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}

/**
 * 删除合约记录
 */
async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'Contract ID is required' });
    }

    const deleteSql = 'DELETE FROM eth_contract WHERE id = ?';
    await mysql.execute(deleteSql, [id]);

    res.status(200).json({
        success: true,
        message: 'Contract deleted successfully'
    });
}

