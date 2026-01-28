import { NextApiRequest, NextApiResponse } from "next";
import { ApiResponse } from "@/src/types/ApiResponse";
import _ from 'lodash';
import findRole from "@/src/domain/novel/findRole";


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse>
) {
    if (req.method !== 'GET') {
        res.status(405).json({ success: false, error: 'only GET method is allowed' });
        return;
    }

    let { worldviewId, keywords, threshold } = req.query;
    // console.debug('req.query ------------->> ', req.query);

    // 立体防御开始

    if (!worldviewId || !keywords) {
        res.status(400).json({ success: false, error: 'oh shit! worldviewId and keywords are required' });
    }

    if (!worldviewId || worldviewId instanceof Array || !/^\d+$/.test(worldviewId)) {
        res.status(400).json({ success: false, error: 'oh shit! worldviewId must be a number' });
    }

    if (_.isString(threshold)) {
        if (!/^\d+(\.\d+)?$/.test(threshold)) {
            res.status(400).json({ success: false, error: 'oh shit! threshold must be a number' });
            return;
        }
    } else if (threshold) {
        res.status(400).json({ success: false, error: 'oh shit! threshold must be a number' });
        return;
    }

    if (!keywords || (!_.isArray(keywords) && !_.isString(keywords))) {
        // console.debug('keywords ------------->> ', keywords);
        res.status(400).json({ success: false, error: 'oh shit! keywords must be an array of strings' });
        return;
    }

    if (_.isString(keywords)) {
        keywords = [keywords];
    }

    // 立体防御结束

    // 业务逻辑开始

    try {
        let rerank_data = await findRole(_.toNumber(worldviewId), keywords as string[], _.toNumber(threshold || '0.5'));
        res.status(200).json({ success: true, data: rerank_data });
        return;
    } catch (error) {
        res.status(500).json({ success: false, error: 'oh shit! ' + error });
        return;
    }

    // 业务逻辑结束
}
