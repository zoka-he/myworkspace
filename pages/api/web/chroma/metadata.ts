import type { NextApiRequest, NextApiResponse } from 'next';
import { chromaService } from '@/src/server/chroma';
import { embedService } from '@/src/services/aiNoval/embedService';

/**
 * Chroma Metadata API
 * 
 * GET /api/web/chroma/metadata?type=character&worldview_id=1 - 获取角色 collection 的所有 metadata
 * GET /api/web/chroma/metadata?type=event&worldview_id=1 - 获取事件 collection 的所有 metadata
 * GET /api/web/chroma/metadata?type=faction&worldview_id=1 - 获取势力 collection 的所有 metadata
 * GET /api/web/chroma/metadata?type=geo&worldview_id=1 - 获取地理 collection 的所有 metadata
 * GET /api/web/chroma/metadata?type=chapter&worldview_id=1 - 获取章节 collection 的所有 metadata
 * GET /api/web/chroma/metadata?collection=custom_name - 获取自定义 collection 的所有 metadata
 */

interface MetadataItem {
    id: string;
    metadata: Record<string, any>;
}

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

type CollectionType = 'character' | 'event' | 'faction' | 'geo' | 'chapter';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse<MetadataItem[]>>
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { type, worldview_id, collection, limit = '1000' } = req.query;

    try {
        // 先检查连接状态
        const isHealthy = await chromaService.checkHealth();
        if (!isHealthy) {
            return res.status(503).json({ 
                success: false, 
                error: 'ChromaDB 服务不可用' 
            });
        }

        const limitNum = parseInt(limit as string);

        // 如果指定了自定义 collection 名称
        if (collection && typeof collection === 'string') {
            const exists = await chromaService.collectionExists(collection);
            if (!exists) {
                return res.status(404).json({ 
                    success: false, 
                    error: `集合 "${collection}" 不存在` 
                });
            }

            const metadataList = await chromaService.listAllMetadata(collection, limitNum);
            return res.status(200).json({ success: true, data: metadataList });
        }

        // 使用预定义的 collection 类型
        if (!type || typeof type !== 'string') {
            return res.status(400).json({ 
                success: false, 
                error: '请指定 type（character/event/faction/geo/chapter）或 collection 参数' 
            });
        }

        if (!worldview_id || typeof worldview_id !== 'string') {
            return res.status(400).json({ 
                success: false, 
                error: '请指定 worldview_id 参数' 
            });
        }

        let metadataList: MetadataItem[] = [];

        switch (type as CollectionType) {
            case 'character':
                metadataList = await embedService.getCharacterMetadataList(worldview_id, limitNum);
                break;
            case 'event':
                metadataList = await embedService.getEventMetadataList(worldview_id, limitNum);
                break;
            case 'faction':
                metadataList = await embedService.getFactionMetadataList(worldview_id, limitNum);
                break;
            case 'geo':
                metadataList = await embedService.getGeoMetadataList(worldview_id, limitNum);
                break;
            case 'chapter':
                metadataList = await embedService.getChapterMetadataList(worldview_id, limitNum);
                break;
            default:
                return res.status(400).json({ 
                    success: false, 
                    error: `不支持的类型: ${type}，支持的类型: character, event, faction, geo, chapter` 
                });
        }

        return res.status(200).json({ success: true, data: metadataList });

    } catch (error) {
        console.error('[Chroma Metadata API] Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
}
