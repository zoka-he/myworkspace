import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import ToolsConfigService from "@/src/services/aiNoval/toolsConfigService";
import { difyCfg } from "@/src/utils/dify";

const keyOfApiKey = 'DIFY_PARAGRAPH_STRIPPER_API_KEY';
const toolsConfigService = new ToolsConfigService();

interface Data {
    message?: string;
    data?: any;
}


function getApiKeyOfWorldview(worldviewId: string | number) {
    return 'DIFY_AUTO_WRITE_API_KEY_' + worldviewId;
}

async function handlePick(req: NextApiRequest, res: NextApiResponse<Data>) {
    let worldviewId = String(req.query.worldviewId);
    if (!worldviewId) {
        res.status(500).json({ message: 'worldviewId is required' });
        return;
    }

    let inputs = { ...req.body };

    let apiKey = await new ToolsConfigService().getConfig(getApiKeyOfWorldview(worldviewId));
    if (!apiKey?.length) {
        res.status(500).json({ message: `${keyOfApiKey} is not set` });
        return;
    }

    let difyDatasetBaseUrl = await toolsConfigService.getConfig('DIFY_DATASET_BASE_URL');
    if (!difyDatasetBaseUrl) {
        res.status(500).json({ message: 'DIFY知识库API入口未设置' });
        return;
    }

    const response_mode = 'blocking';

    try {
        const externalApiUrl = difyDatasetBaseUrl + '/workflows/run';
        const reqHeaders = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        };

        const body = {
            inputs,
            response_mode,
            user: "my-worksite"
        }

        
        // Blocking mode
        const response = await fetch(externalApiUrl, {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify(body),
            timeout: 1000 * 60 * 10
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(response.status, response.statusText, response.url, text);
            throw new Error(`External API responded with status: ${response.status}, reason: ${text}`);
        }

        const data = await response.json();
        res.status(200).json(data);

    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ message: 'Request failed' });
    }
}

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    let processerFn: Function | undefined = undefined;
    switch (req.method) {
        case 'POST':
            processerFn = handlePick;
            break;
    }

    if (!processerFn) {
        res.status(500).json({ message: '不支持的操作!' });
        return;
    }

    processerFn(req, res);
}