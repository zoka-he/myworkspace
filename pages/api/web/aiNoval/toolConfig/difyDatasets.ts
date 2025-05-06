import type { NextApiRequest, NextApiResponse } from 'next'
import Dify from '@/src/utils/dify';
import { ILlmDatasetInfo } from '@/src/utils/dify/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
    let datasets = await Dify.getDatasets();

    if (!datasets || !Array.isArray(datasets)) {
        console.debug('获取知识库列表失败', datasets);
        res.status(500).json({ message: '返回内容错误，请检查Dify服务状态' });
        return;
    }

    res.status(200).json(datasets);
}