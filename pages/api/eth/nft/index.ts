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
        contract_id,
        contract_address,
        token_id,
        owner_address,
        minter_address,
        minter_account_id,
        metadata_uri,
        name,
        description,
        image_url,
        attributes,
        transaction_hash,
        network_id,
        network,
        chain_id,
        status = 'minted',
        remark
    } = req.body;

    // 验证必需字段
    if (!contract_address || !token_id || !owner_address || !minter_address) {
        return res.status(400).json({ 
            error: 'Missing required fields: contract_address, token_id, owner_address, minter_address' 
        });
    }

    // 检查是否已存在
    const existing = await service.query({
        contract_address,
        token_id
    }, [], [], 1, 1);

    if (existing && existing.data && existing.data.length > 0) {
        return res.status(400).json({ 
            error: 'NFT already exists with this contract address and token ID' 
        });
    }

    // 使用 service 创建记录
    const nftData: any = {
        contract_id: contract_id || null,
        contract_address,
        token_id,
        owner_address,
        minter_address,
        minter_account_id: minter_account_id || null,
        metadata_uri: metadata_uri || null,
        name: name || null,
        description: description || null,
        image_url: image_url || null,
        attributes: attributes || null,
        transaction_hash: transaction_hash || null,
        network_id: network_id || null,
        network: network || null,
        chain_id: chain_id || null,
        status: status || 'minted',
        remark: remark || null
    };

    const result = await service.insert(nftData);

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
        owner_address,
        metadata_uri,
        name,
        description,
        image_url,
        attributes,
        status,
        remark
    } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'Missing required field: id' });
    }

    let updateFields = [];
    let params: any[] = [];

    if (owner_address !== undefined) {
        updateFields.push('owner_address = ?');
        params.push(owner_address);
    }

    if (metadata_uri !== undefined) {
        updateFields.push('metadata_uri = ?');
        params.push(metadata_uri);
    }

    if (name !== undefined) {
        updateFields.push('name = ?');
        params.push(name);
    }

    if (description !== undefined) {
        updateFields.push('description = ?');
        params.push(description);
    }

    if (image_url !== undefined) {
        updateFields.push('image_url = ?');
        params.push(image_url);
    }

    if (attributes !== undefined) {
        updateFields.push('attributes = ?');
        params.push(attributes);
    }

    if (status !== undefined) {
        updateFields.push('status = ?');
        params.push(status);
    }

    if (remark !== undefined) {
        updateFields.push('remark = ?');
        params.push(remark);
    }

    if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    const updateData: any = {};
    
    if (owner_address !== undefined) updateData.owner_address = owner_address;
    if (metadata_uri !== undefined) updateData.metadata_uri = metadata_uri;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (attributes !== undefined) updateData.attributes = attributes;
    if (status !== undefined) updateData.status = status;
    if (remark !== undefined) updateData.remark = remark;

    await service.update(id, updateData);

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

