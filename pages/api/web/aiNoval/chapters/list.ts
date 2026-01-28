// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import ChaptersService from '@/src/services/aiNoval/chaptersService';
import _ from 'lodash';
import { ISqlCondMap } from '@/src/utils/mysql/types';

type Data = Object;

const service = new ChaptersService();


async function research(req: NextApiRequest, res: NextApiResponse) {
    console.debug('req query', req.query);

    let page = _.toNumber(req.query.page || 1);
    let limit = _.toNumber(req.query.limit || 20);

    let mode = req.query.mode || 'base';

    const numExp = /^[1-9]\d+$/;
    if (numExp.test(req.query.from as string) && numExp.test(req.query.to as string)) {
        page = 1;
        limit = _.toNumber(req.query.to) - _.toNumber(req.query.from) + 1;
        mode = 'anything';
    } else {
        if (req.query.from) {
            delete req.query.from;
        }

        if (req.query.to) {
            delete req.query.to;
        }
    }

    
    if (mode === 'base') {
        if (!req.query.novelId) {
            res.status(500).json({ message: 'novelId is required in base mode, or set mode=anything' });
            return;
        }
        let ret = await service.getChapterListBaseInfo(_.toNumber(req.query.novelId), page, limit);
        res.status(200).json(ret);
    } else {
        let queryObject: ISqlCondMap = {};
        for (let [k, v] of Object.entries(req.query)) {
            if (v === undefined) {
                continue;
            }

            switch(k) {
                case 'novel_id':
                    queryObject.novel_id = v;
                    break;
                case 'chapter_number':
                    queryObject.chapter_number = v;
                    break;
                case 'version':
                    queryObject.version = v;
                    break;
                case 'title':
                    queryObject.title = v;
                    break;
                // case 'from':
                //     queryObject.chapter_number = { '$gte': _.toNumber(v) };
                //     break;
                // case 'to':
                //     queryObject.chapter_number = { '$lte': _.toNumber(v) };
                //     break;
            }
        }

        // orm设计问题，如果同时设置chapter_number，后来的会覆盖先到的
        if (req.query.from && req.query.to) {
            queryObject.chapter_number = { '$btw': [_.toNumber(req.query.from), _.toNumber(req.query.to)] };
        }

        let ret = await service.query(queryObject, [], ['chapter_number asc', 'version asc'], page, limit);
        res.status(200).json(ret);
    }
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
