import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import ToolsConfigService from "@/src/services/aiNoval/toolsConfigService";
import ChaptersService from "@/src/services/aiNoval/chaptersService";
import { difyCfg } from "@/src/utils/dify";
import _ from "lodash";

const keyOfApiKey = 'DIFY_PATAGRAPH_TITLE_API_KEY';

interface Data {
    message?: string;
    data?: any;
}

async function handleNaming(req: NextApiRequest, res: NextApiResponse<Data>) {
    console.log('handleNaming -->', req.query);

    let chapterId = _.toNumber(req.query.chapterId);
    if (typeof chapterId !== 'number' || _.isNaN(chapterId)) {
        res.status(500).json({ message: 'chapterId is not a number' });
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

    let apiKey = await new ToolsConfigService().getConfig(keyOfApiKey);
    if (!apiKey?.length) {
        res.status(500).json({ message: `${keyOfApiKey} is not set` });
        return;
    }

    const response_mode = 'blocking';

    try {
        const externalApiUrl = difyCfg.serverUrl + '/workflows/run';
        const reqHeaders = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        };

        const body = {
            inputs: {
                src_text
            },
            response_mode,
            user: "my-worksite"
        }

        
        // Blocking mode
        const response = await fetch(externalApiUrl, {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`External API responded with status: ${response.status}`);
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
            processerFn = handleNaming;
            break;
    }

    if (!processerFn) {
        res.status(500).json({ message: '不支持的操作!' });
        return;
    }

    processerFn(req, res);
}