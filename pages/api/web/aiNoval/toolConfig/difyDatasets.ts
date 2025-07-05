import type { NextApiRequest, NextApiResponse } from 'next'
import Dify from '@/src/utils/dify';
import { ILlmDatasetInfo } from '@/src/utils/dify/types';
import ToolsConfigService from "@/src/services/aiNoval/toolsConfigService";


const toolsConfigService = new ToolsConfigService();

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {

    let difyDatasetApiKey = await toolsConfigService.getConfig('DIFY_DATASET_API_KEY');
    if (!difyDatasetApiKey) {
        res.status(500).json({ message: 'DIFY知识库API Key未设置' });
        return;
    }

    let difyDatasetBaseUrl = await toolsConfigService.getConfig('DIFY_DATASET_BASE_URL');
    if (!difyDatasetBaseUrl) {
        res.status(500).json({ message: 'DIFY知识库API入口未设置' });
        return;
    }

    let datasets = await Dify.getDatasets(difyDatasetBaseUrl, difyDatasetApiKey);

    if (!datasets || !Array.isArray(datasets)) {
        console.debug('获取知识库列表失败', datasets);
        res.status(500).json({ message: '返回内容错误，请检查Dify服务状态' });
        return;
    }

    res.status(200).json(datasets);
}