import type { NextApiRequest, NextApiResponse } from 'next';
import { chromaService } from '@/src/server/chroma';
import { embedService } from '@/src/services/aiNoval/embedService';

/**
 * Chroma Query API
 * 
 * POST /api/web/chroma/query - 查询文档（相似度搜索）
 * Body: { collection, queryText, nResults?, where? }
 */

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

interface QueryRequest {
    collection: string;
    queryText: string;
    nResults?: number;
    where?: Record<string, any>;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { collection, queryText, nResults = 10, where } = req.body as QueryRequest;

    if (!collection || typeof collection !== 'string') {
        return res.status(400).json({ 
            success: false, 
            error: '请指定集合名称' 
        });
    }

    if (!queryText || typeof queryText !== 'string') {
        return res.status(400).json({ 
            success: false, 
            error: '请输入查询文本' 
        });
    }

    let t0 = Date.now(), t1 = Date.now();

    try {
        // 先检查连接状态
        const isHealthy = await chromaService.checkHealth();
        if (!isHealthy) {
            return res.status(503).json({ 
                success: false, 
                error: 'ChromaDB 服务不可用' 
            });
        }

        t1 = Date.now();
        console.debug('检测chroma连通性：', t1 - t0);

        t0 = Date.now();
        // 检查集合是否存在
        const exists = await chromaService.collectionExists(collection);
        if (!exists) {
            return res.status(404).json({ 
                success: false, 
                error: `集合 "${collection}" 不存在` 
            });
        }
        t1 = Date.now();
        console.debug('检测集合是否存在：', t1 - t0);


        t0 = Date.now();
        // 使用 embedService 生成查询向量
        const queryEmbedding = await embedService.embedQuery(queryText);
        t1 = Date.now();
        console.debug('生成查询向量：', t1 - t0);

        t0 = Date.now();
        // 执行相似度搜索
        const results = await chromaService.similaritySearch(
            collection,
            queryEmbedding,
            nResults,
            where
        );
        t1 = Date.now();
        console.debug('执行相似度搜索：', t1 - t0);

        return res.status(200).json({ 
            success: true, 
            data: {
                results,
                queryText,
                nResults: results.length
            }
        });
    } catch (error) {
        console.error('[Chroma Query API] Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
}
