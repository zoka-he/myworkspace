// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import ChaptersService from '@/src/services/aiNoval/chaptersService';
import _ from 'lodash';
import { ISqlCondMap } from '@/src/utils/mysql/types';

type Data = Object;

const service = new ChaptersService();


async function research(req: NextApiRequest, res: NextApiResponse) {
    console.debug('req query', req.query);

    const page = _.toNumber(req.query.page || 1);
    const limit = _.toNumber(req.query.limit || 20);

    const dataType = req.query.dataType || 'base';

    // let queryObject: ISqlCondMap = {};

    // for (let [k, v] of Object.entries(req.query)) {
    //     if (v === undefined) {
    //         continue;
    //     }

    //     switch(k) {
    //         case 'novel_id':
    //             queryObject.novel_id = v;
    //             break;
    //     }
    // }

    // let ret = await service.query(queryObject, [], ['chapter_number asc', 'version asc'], page, limit);
    let ret = await service.getChapterListBaseInfo(req.query.novelId, page, limit);

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
