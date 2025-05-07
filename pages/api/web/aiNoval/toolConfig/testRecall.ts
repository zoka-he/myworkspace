import Dify from "@/src/utils/dify";
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
    
    let result = await Dify.queryDataset(datasetId, query);
    console.debug('result', result);

    res.status(200).json(result);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    return await handleGet(req, res);
}