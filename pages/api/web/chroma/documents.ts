import type { NextApiRequest, NextApiResponse } from 'next';
import { chromaService } from '@/src/server/chroma';

/**
 * Chroma Documents API
 * 
 * GET /api/web/chroma/documents?collection=name&offset=0&limit=20 - 获取文档列表
 * DELETE /api/web/chroma/documents?collection=name&id=doc_id - 删除指定文档
 */

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse>
) {
    const { collection, id, offset = '0', limit = '20' } = req.query;

    if (!collection || typeof collection !== 'string') {
        return res.status(400).json({ 
            success: false, 
            error: '请指定集合名称' 
        });
    }

    try {
        // 先检查连接状态
        const isHealthy = await chromaService.checkHealth();
        if (!isHealthy) {
            return res.status(503).json({ 
                success: false, 
                error: 'ChromaDB 服务不可用' 
            });
        }

        // 检查集合是否存在
        const exists = await chromaService.collectionExists(collection);
        if (!exists) {
            return res.status(404).json({ 
                success: false, 
                error: `集合 "${collection}" 不存在` 
            });
        }

        if (req.method === 'GET') {
            const { documents, total } = await chromaService.list(
                collection,
                parseInt(offset as string),
                parseInt(limit as string)
            );

            return res.status(200).json({ 
                success: true, 
                data: { documents, total } 
            });
        } else if (req.method === 'DELETE') {
            if (!id || typeof id !== 'string') {
                return res.status(400).json({ 
                    success: false, 
                    error: '请指定要删除的文档ID' 
                });
            }

            await chromaService.deleteById(collection, id);
            return res.status(200).json({ success: true, data: true });
        } else {
            return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('[Chroma Documents API] Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
}
