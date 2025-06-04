import { NextApiRequest, NextApiResponse } from "next";
import ToolsConfigService from "@/src/services/aiNoval/toolsConfigService";

interface Data {
    message?: string;
    url?: any;
}

// 获取写作(细纲)API Key
function getApiKeyOfWorldview(worldviewId: number) {
    return 'DIFY_AUTO_WRITE_WITH_CHAT_API_KEY_' + worldviewId;
}

async function handlePick(req: NextApiRequest, res: NextApiResponse<Data>) {

    let worldviewId = req.query.worldviewId;
    if (!worldviewId) {
        res.status(500).json({ message: 'worldviewId is required' });
        return;
    }

    const keyOfApiKey = getApiKeyOfWorldview(Number(worldviewId));
    let apiKey = await new ToolsConfigService().getConfig(keyOfApiKey);
    if (!apiKey?.length) {
        res.status(500).json({ message: `${keyOfApiKey} is not set` });
        return;
    }

    res.status(200).json({ url: apiKey }); 
}

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    let processerFn: Function | undefined = undefined;
    switch (req.method) {
        case 'GET':
            processerFn = handlePick;
            break;
    }

    if (!processerFn) {
        res.status(500).json({ message: '不支持的操作!' });
        return;
    }

    processerFn(req, res);
}