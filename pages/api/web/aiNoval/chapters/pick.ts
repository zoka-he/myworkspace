import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import ToolsConfigService from "@/src/services/aiNoval/toolsConfigService";
import { difyCfg } from "@/src/utils/dify";

const keyOfApiKey = 'DIFY_PARAGRAPH_STRIPPER_API_KEY';

interface Data {
    message?: string;
    data?: any;
}


function getApiKeyOfTarget(target: string) {
    switch (target) {
        case 'roles':
            return 'DIFY_PARAGRAPH_ROLES_API_KEY';
        case 'factions':
            return 'DIFY_PARAGRAPH_FACTIONS_API_KEY';
        case 'locations':
            return 'DIFY_PARAGRAPH_LOCATIONS_API_KEY';
        default:
            return '';
    }
}

async function handlePick(req: NextApiRequest, res: NextApiResponse<Data>) {
    let target = String(req.query.target);
    if (!['roles', 'factions', 'locations'].includes(target)) {
        res.status(500).json({ message: 'target is not valid, valid values: roles, factions, locations' });
        return;
    }

    let src_text = req.body.src_text;
    if (!src_text?.length) {
        res.status(500).json({ message: 'there is no src_text in request body json' });
        return;
    }


    let apiKey = await new ToolsConfigService().getConfig(getApiKeyOfTarget(target));
    if (!apiKey?.length) {
        res.status(500).json({ message: `${keyOfApiKey} is not set` });
        return;
    }

    const response_mode = req.query.response_mode === 'streaming' ? 'streaming' : 'blocking';

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
            processerFn = handlePick;
            break;
    }

    if (!processerFn) {
        res.status(500).json({ message: '不支持的操作!' });
        return;
    }

    processerFn(req, res);
}