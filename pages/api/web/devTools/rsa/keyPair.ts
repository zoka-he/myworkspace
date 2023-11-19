// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import Crypto from 'crypto';

async function research(req: NextApiRequest, res: NextApiResponse) {
    const { publicKey, privateKey } = Crypto.generateKeyPairSync(
        'rsa',
        {
            modulusLength: 2048
        }
    );

    res.status(200).json({
        success: true,
        publicKey: publicKey.export({ type: 'pkcs1', format: 'pem' }),
        privateKey: privateKey.export({ type: 'pkcs1', format: 'pem' })
    })
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
    }

    if (!processerFn) {
        res.status(500).json({ message: '不支持的操作!' })
        return;
    }

    processerFn(req, res);
}
