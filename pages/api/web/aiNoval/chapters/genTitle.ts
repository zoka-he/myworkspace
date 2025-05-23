import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import ToolsConfigService from "@/src/services/aiNoval/toolsConfigService";
import ChaptersService from "@/src/services/aiNoval/chaptersService";
import { difyCfg } from "@/src/utils/dify";
import _ from "lodash";
import { withErrorHandler, createApiError } from '@/src/utils/api/errorHandler';

const keyOfApiKey = 'DIFY_PATAGRAPH_TITLE_API_KEY';

type Data = {
    message?: string;
    error?: string;
    [key: string]: any;
};

async function handleNaming(req: NextApiRequest, res: NextApiResponse<Data>) {
    console.log('handleNaming -->', req.query);

    let chapterId = _.toNumber(req.query.chapterId);
    if (typeof chapterId !== 'number' || _.isNaN(chapterId)) {
        throw createApiError('chapterId is not a number', 400);
    }

    let chapter = await new ChaptersService().queryOne({ id: chapterId });
    if (!chapter) {
        throw createApiError('chapter not found', 404);
    }

    let src_text = chapter.content;
    if (!src_text?.length) {
        throw createApiError('chapter content is empty', 400);
    }

    let apiKey = await new ToolsConfigService().getConfig(keyOfApiKey);
    if (!apiKey?.length) {
        throw createApiError(`${keyOfApiKey} is not set`, 500);
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

        const response = await fetch(externalApiUrl, {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            console.debug('body', body);
            console.debug('body length', body.inputs.src_text.length);
            console.debug('response', response);
            throw createApiError(`External API responded with status: ${response.status}`, response.status);
        }

        const data = await response.json();
        res.status(200).json(data);

    } catch (error: any) {
        if (error.statusCode) throw error;
        throw createApiError('Request failed', 500, error);
    }
}

export default withErrorHandler(handleNaming);