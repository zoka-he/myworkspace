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
    const checkQuery = `
        SELECT id FROM nft 
        WHERE contract_address = ? AND token_id = ?
    `;
    const existing: any = await mysqlQuery(checkQuery, [contract_address, token_id]);

    if (existing && existing.length > 0) {
        return res.status(400).json({ 
            error: 'NFT already exists with this contract address and token ID' 
        });
    }

    const query = `
        INSERT INTO nft (
            contract_id, contract_address, token_id, owner_address, minter_address,
            minter_account_id, metadata_uri, name, description, image_url,
            attributes, transaction_hash, network_id, network, chain_id,
            status, remark, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const params = [
        contract_id || null,
        contract_address,
        token_id,
        owner_address,
        minter_address,
        minter_account_id || null,
        metadata_uri || null,
        name || null,
        description || null,
        image_url || null,
        attributes || null,
        transaction_hash || null,
        network_id || null,
        network || null,
        chain_id || null,
        status,
        remark || null
    ];

    const result: any = await mysqlQuery(query, params);

    res.status(201).json({
        message: 'NFT created successfully',
        id: result.insertId
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

    updateFields.push('update_time = NOW()');

    const query = `
        UPDATE nft 
        SET ${updateFields.join(', ')}
        WHERE id = ?
    `;

    params.push(id);

    await mysqlQuery(query, params);

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

    const query = 'DELETE FROM nft WHERE id = ?';
    await mysqlQuery(query, [id]);

    res.status(200).json({ message: 'NFT deleted successfully' });
}

