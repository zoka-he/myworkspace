import { NextApiRequest, NextApiResponse } from "next";
import RoleInfoService from "@/src/services/aiNoval/roleInfoService";
import { ISqlCondMap } from "@/src/utils/mysql/types";
import _ from 'lodash';

const roleDefService = new RoleInfoService();

async function createOrUpdateOne(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const body = req.body;
    console.debug('body', body);

    if (typeof id === 'undefined') {
        await roleDefService.insertOne(body);
        res.status(200).json({ message: 'created' });
    } else {
        await roleDefService.updateOne({ id }, body);
        res.status(200).json({ message: 'updated, id:' + id });
    }
}

async function research(req: NextApiRequest, res: NextApiResponse) {
    const { id, name, worldview_id, page, limit } = req.query;

    if (!!id) { // -- 查询单个角色信息
        let data = await roleDefService.queryOne({ id });
        if (!data) {
            res.status(404).json({ message: 'not found, id:' + id });
        } else {
            res.status(200).json(data);
        }
    } else { // -- 按名称模糊查询角色信息，给AI用
        let params : ISqlCondMap = {};
        if (!!name) {
            // 注意注意，这里查询的是角色在某个世界观中的名称
            params.name_in_worldview = { $like: `%${name}%` };
        }

        if (!!worldview_id) {
            // 注意注意，如果有世界观ID，则只查询该世界观中的角色信息
            params.worldview_id = _.toNumber(worldview_id);
        }

        let data = await roleDefService.query(params, [], ['id asc'], _.toNumber(page), _.toNumber(limit));
        res.status(200).json(data);

    }
}

async function deleteOne(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    if (typeof id === 'undefined') {
        res.status(500).json({ message: 'id is required' });
    } else {
        await roleDefService.deleteOne({ id });
        res.status(200).json({ message: 'deleted, id:' + id });
    }
}

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<any>
) {
    let processerFn: Function | undefined = undefined;
    switch (req.method) {
        case 'GET':
            processerFn = research;
            break;
        case 'POST':
            processerFn = createOrUpdateOne;
            break;
        case 'DELETE':
            processerFn = deleteOne
            break;
    }

    if (!processerFn) {
        res.status(500).json({ message: '不支持的操作!' })
        return;
    }

    processerFn(req, res);
}
