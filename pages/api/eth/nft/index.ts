import type { NextApiRequest, NextApiResponse } from 'next';
// import { mysqlQuery } from '@/src/utils/mysql/mysql';
// import { verifyJWT } from '@/interceptors/appInterceptor/verifyJwt';
import EthNftService from '@/src/services/eth/ethNftService';
import { ISqlCondMap } from '@/src/types/IMysqlActions';

const service = new EthNftService();

/**
 * NFT管理接口
 * GET: 查询NFT列表
 * POST: 创建NFT记录
 * PUT: 更新NFT记录
 * DELETE: 删除NFT记录
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // 验证用户身份
    // const userId = await verifyJWT(req, res);
    // if (!userId) {
    //     return;
    // }

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
        console.error('NFT API Error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
}

/**
 * 查询NFT列表
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
    const { 
        page = 1, 
        limit = 10, 
        id,
        name,
        token_id,
        contract_id,
        contract_address,
        owner_address,
        minter_address,
        network_id,
        status
    } = req.query;

    // let whereClauses = [];
    let params: ISqlCondMap = {};


    if (id) {
        params.id = id;
    }

    if (name) {
        params.name = { $like: `%${name}%` };
    }

    if (token_id) {
        params.token_id = token_id;
    }

    if (contract_id) {
        params.contract_id = contract_id;
    }

    if (contract_address) {
        params.contract_address = { $like: `%${contract_address}%` };
    }

    if (owner_address) {
        params.owner_address = { $like: `%${owner_address}%` };
    }

    if (minter_address) {
        params.minter_address = { $like: `%${minter_address}%` };
    }

    if (network_id) {
        params.network_id = network_id;
    }

    if (status) {
        params.status = status;
    }

    const result: any = await service.query(params, [], ['create_time desc'], Number(page), Number(limit));

    res.status(200).json(result);
}

/**
 * 创建NFT记录
 */
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
    
    const {
        contract_address,
        token_id,
        owner_address,
        minter_address,
    } = req.body;

    // 验证必需字段
    if (!contract_address || !token_id || !owner_address || !minter_address) {
        return res.status(400).json({ 
            error: 'Missing required fields: contract_address, token_id, owner_address, minter_address' 
        });
    }

    let values: any = {...req.body};
    delete values.id;
    if (!values.status) {
        values.status = 'minted';
    }


    // 检查是否已存在
    const existing = await service.query({
        contract_address,
        token_id
    }, [], ['create_time desc'], 1, 1);

    if (existing && existing.data && existing.data.length > 0) {
        return res.status(400).json({ 
            error: 'NFT already exists with this contract address and token ID' 
        });
    }

    const result = await service.insertOne(values);

    res.status(201).json({
        message: 'NFT created successfully',
        id: result
    });
}

/**
 * 更新NFT记录
 */
async function handlePut(req: NextApiRequest, res: NextApiResponse) {

    const {
        id,
    } = req.body;

    let values: any = {...req.body};
    delete values.id;

    if (!id) {
        return res.status(400).json({ error: 'Missing required field: id' });
    }

    await service.updateOne({ id }, values);

    res.status(200).json({ message: 'NFT updated successfully' });
}

/**
 * 删除NFT记录
 */
async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'Missing required parameter: id' });
    }

    await service.delete(id);

    res.status(200).json({ message: 'NFT deleted successfully' });
}

