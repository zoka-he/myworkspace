import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(404).json({
    error: 'API route not found',
    path: req.url,
  });
}
