import type { NextApiRequest, NextApiResponse } from 'next';
import { chromaService } from '@/src/server/chroma';
import chromaConfig from '@/src/config/chroma';

/**
 * Chroma Health Check API
 * 
 * GET /api/web/chroma/health - 检查 ChromaDB 连接状态
 */

interface HealthInfo {
    status: 'connected' | 'disconnected';
    url: string;
    timestamp: string;
}

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse<HealthInfo>>
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const isHealthy = await chromaService.checkHealth();
        
        const healthInfo: HealthInfo = {
            status: isHealthy ? 'connected' : 'disconnected',
            url: chromaConfig.CHROMA_URL,
            timestamp: new Date().toISOString(),
        };

        // 无论连接是否成功，都返回 success: true，status 字段表示连接状态
        return res.status(200).json({ success: true, data: healthInfo });
    } catch (error) {
        console.error('[Chroma Health API] Error:', error);
        // 即使出错也返回 URL 信息方便调试
        const healthInfo: HealthInfo = {
            status: 'disconnected',
            url: chromaConfig.CHROMA_URL,
            timestamp: new Date().toISOString(),
        };
        return res.status(200).json({ 
            success: true, 
            data: healthInfo,
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
}
