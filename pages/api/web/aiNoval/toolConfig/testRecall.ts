import Dify from '@/src/utils/dify/dify_api';
import { NextApiRequest, NextApiResponse } from "next";
import _ from "lodash";
import ToolsConfigService from "@/src/services/aiNoval/toolsConfigService";

const toolsConfigService = new ToolsConfigService();



async function handleGet(req: NextApiRequest, res: NextApiResponse) {
    console.debug('req query', req.query);

    const query = req.query.query as string;
    const datasetName = req.query.datasetName as string;

    let datasetId = await toolsConfigService.getConfig(datasetName);
    console.debug('datasetId', datasetId);

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

    let difyApi = new Dify(difyDatasetApiKey, difyDatasetBaseUrl);
    
    let result = await difyApi.queryDataset(datasetId, query);
    console.debug('result', result);

    res.status(200).json(result);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    return await handleGet(req, res);
}