import type { NextApiRequest, NextApiResponse } from 'next';
import { chromaService } from '@/src/server/chroma';

/**
 * Chroma Collections API
 * 
 * GET /api/web/chroma/collections - 获取所有集合列表
 * GET /api/web/chroma/collections?name=collection_name - 获取指定集合详情
 * DELETE /api/web/chroma/collections?name=collection_name - 删除指定集合
 */

interface CollectionInfo {
    name: string;
    count: number;
}

interface CollectionDetail extends CollectionInfo {
    documents: {
        id: string;
        content: string;
        metadata: Record<string, any>;
    }[];
    total: number;
}

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse<CollectionInfo[] | CollectionDetail | boolean>>
) {
    const { name, offset = '0', limit = '20' } = req.query;

    try {
        // 先检查连接状态
        const isHealthy = await chromaService.checkHealth();
        if (!isHealthy) {
            return res.status(503).json({ 
                success: false, 
                error: 'ChromaDB 服务不可用' 
            });
        }

        if (req.method === 'GET') {
            if (name && typeof name === 'string') {
                // 获取指定集合详情
                const exists = await chromaService.collectionExists(name);
                if (!exists) {
                    return res.status(404).json({ 
                        success: false, 
                        error: `集合 "${name}" 不存在` 
                    });
                }

                const count = await chromaService.count(name);
                const { documents, total } = await chromaService.list(
                    name, 
                    parseInt(offset as string), 
                    parseInt(limit as string)
                );

                const detail: CollectionDetail = {
                    name,
                    count,
                    documents,
                    total,
                };

                return res.status(200).json({ success: true, data: detail });
            } else {
                // 获取所有集合列表
                const collectionNames = await chromaService.listCollections();
                
                // 获取每个集合的文档数量
                const collections: CollectionInfo[] = await Promise.all(
                    collectionNames.map(async (collName) => {
                        const count = await chromaService.count(collName);
                        return { name: collName, count };
                    })
                );

                return res.status(200).json({ success: true, data: collections });
            }
        } else if (req.method === 'DELETE') {
            if (!name || typeof name !== 'string') {
                return res.status(400).json({ 
                    success: false, 
                    error: '请指定要删除的集合名称' 
                });
            }

            const exists = await chromaService.collectionExists(name);
            if (!exists) {
                return res.status(404).json({ 
                    success: false, 
                    error: `集合 "${name}" 不存在` 
                });
            }

            await chromaService.deleteCollection(name);
            return res.status(200).json({ success: true, data: true });
        } else {
            return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('[Chroma API] Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
}
