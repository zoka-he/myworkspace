import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import ToolsConfigService from "@/src/services/aiNoval/toolsConfigService";
import ChaptersService from "@/src/services/aiNoval/chaptersService";
import { difyCfg } from "@/src/utils/dify";
import _ from "lodash";

const keyOfApiKey = 'DIFY_PARAGRAPH_STRIPPER_API_KEY';
const toolsConfigService = new ToolsConfigService();

interface Data {
    message?: string;
    data?: any;
}

async function handleStrip(req: NextApiRequest, res: NextApiResponse<Data>) {
    let chapterId = _.toNumber(req.query.chapterId);
    if (typeof chapterId !== 'number') {
        res.status(500).json({ message: 'chapterId is not a number' });
        return;
    }

    let stripLength = _.toNumber(req.query.stripLength);
    if (typeof stripLength !== 'number') {
        res.status(500).json({ message: 'stripLength is not a number' });
        return;
    }

    let chapter = await new ChaptersService().queryOne({ id: chapterId });
    if (!chapter) {
        res.status(500).json({ message: 'chapter not found' });
        return;
    }

    let src_text = chapter.content;
    if (!src_text?.length) {
        res.status(500).json({ message: 'chapter content is empty' });
        return;
    }

    let difyDatasetBaseUrl
    if (req.query.difyHost) {
        difyDatasetBaseUrl = `http://${req.query.difyHost}/v1`;
    } else {
        difyDatasetBaseUrl = await toolsConfigService.getConfig('DIFY_DATASET_BASE_URL');
    }
    if (!difyDatasetBaseUrl) {
        res.status(500).json({ message: 'DIFY知识库API入口未设置' });
        return;
    }


    let apiKey = await toolsConfigService.getConfig(keyOfApiKey);
    if (!apiKey?.length) {
        res.status(500).json({ message: `${keyOfApiKey} is not set` });
        return;
    }

    const response_mode = req.query.response_mode === 'streaming' ? 'streaming' : 'blocking';

    try {
        const externalApiUrl = difyDatasetBaseUrl + '/workflows/run';
        const reqHeaders = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        };

        const body = {
            inputs: {
                src_text,
                stripped_length: stripLength
            },
            response_mode,
            user: "my-worksite"
        }

        if (response_mode === 'streaming') {
            // Set headers for streaming response
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const response = await fetch(externalApiUrl, {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(body),
                timeout: 1000 * 60 * 10
            });

            if (!response.ok) {
                throw new Error(`External API responded with status: ${response.status}`);
            }

            // Pipe the streaming response to our client
            response.body?.pipe(res);

            // Handle client disconnect
            req.on('close', () => {
                res.end();
            });
        } else {
            // Blocking mode
            console.debug('strip chapter blocking -> ', chapterId, stripLength)
            console.debug('External API URL:', externalApiUrl)
            console.debug('Request headers:', reqHeaders)
            console.debug('Request body:', body)
            
            const response = await fetch(externalApiUrl, {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify(body),
                timeout: 1000 * 60 * 10
            });

            console.debug('strip chapter blocking response -> ', response)
            console.debug('Response status:', response.status)
            console.debug('Response headers:', response.headers)

            if (!response.ok) {
                throw new Error(`External API responded with status: ${response.status}`);
            }

            const data = await response.json();
            res.status(200).json(data);
        }
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ message: 'Request failed: ' + (error as Error).message });
    }
}

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    let processerFn: Function | undefined = undefined;
    switch (req.method) {
        case 'POST':
            processerFn = handleStrip;
            break;
    }

    if (!processerFn) {
        res.status(500).json({ message: '不支持的操作!' });
        return;
    }

    processerFn(req, res);
}