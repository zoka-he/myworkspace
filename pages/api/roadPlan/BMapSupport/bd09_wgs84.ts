import { NextApiRequest, NextApiResponse } from "next";
import fetch from '@/src/fetch';
import BMapConfig from '@/src/config/bmap';

interface Data {
    lng?: number,
    lat?: number,
    message: string
}

function research(req: NextApiRequest, res: NextApiResponse<Data>) {

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