// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import TimelineDefService from '@/src/services/aiNoval/timelineDefService';
import _, { reject } from 'lodash';
import { ISqlCondMap } from '@/src/utils/mysql/types';

type Data = Object;

const service = new TimelineDefService();


async function research(req: NextApiRequest, res: NextApiResponse) {
    console.debug('req query', req.query);

    const page = _.toNumber(req.query.page || 1);
    const limit = _.toNumber(req.query.limit || 20);

    let queryObject: ISqlCondMap = {};

    for (let [k, v] of Object.entries(req.query)) {
        if (v === undefined) {
            continue;
        }

        switch(k) {
            case 'worldview_id':
                queryObject.worldview_id = _.toNumber(v);
                break;
            case 'id':
                queryObject.id = _.toNumber(v);
                break;
            case 'ids':
                if (_.isString(v)) {
                    let ids = v
                        .split(',')
                        .filter((id: string) => id.trim() !== '')
                        .map((id: string) => _.toNumber(id)) 
                        .filter((id: number) => id > 0)
                    if (ids.length === 0) {
                        break
                    }
                    
                    queryObject.id = { 
                        $in: v
                            .split(',')
                            .filter((id: string) => id.trim() !== '')
                            .map((id: string) => _.toNumber(id)) 
                            .filter((id: number) => id > 0)
                    };
                }
                if (_.isNumber(v)) {
                    queryObject.id = _.toNumber(v);
                }
                break;
        }
    }


    let ret = await service.query(queryObject, [], ['id asc'], page, limit);

    // 拆解阵营id和角色id
    let dataList = ret.data.map(item => {

        // console.debug('event item --> ', item);

        if (item.faction_ids) {
            item.faction_ids = item.faction_ids.split(',').filter((id: string) => id.trim() !== '').map((id: string) => _.toNumber(id));
        }

        if (item.role_ids) {
            item.role_ids = item.role_ids.split(',').filter((id: string) => id.trim() !== '').map((id: string) => _.toNumber(id));
        }

        return item;
    })

    ret.data = dataList;

    res.status(200).json(ret);
}

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    let processerFn: Function | undefined = undefined;
    switch (req.method) {
        case 'GET':
            processerFn = research;
            break;
    }

    if (!processerFn) {
        res.status(500).json({ message: '不支持的操作!' })
        return;
    }

    try {
      processerFn(req, res);
    } catch(e: any) {
      res.status(500).json({ message: e.message });
      return;
    }
}
