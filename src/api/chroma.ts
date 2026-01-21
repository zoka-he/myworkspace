import fetch from '@/src/fetch';

/**
 * 获取 Chroma 健康状态
 */
export function fetchChromaHealth() {
    return fetch.get('/api/web/chroma/health');
}

/**
 * 获取所有集合列表
 */
export function fetchChromaCollections() {
    return fetch.get('/api/web/chroma/collections');
}

/**
 * 获取指定集合详情
 */
export function fetchChromaCollectionDetail(name: string, params?: { offset?: number; limit?: number }) {
    return fetch.get('/api/web/chroma/collections', { 
        params: { name, ...params } 
    });
}

/**
 * 删除集合
 */
export function deleteChromaCollection(name: string) {
    return fetch.delete('/api/web/chroma/collections', { 
        params: { name } 
    });
}

/**
 * 获取集合中的文档列表
 */
export function fetchChromaDocuments(collection: string, params?: { offset?: number; limit?: number }) {
    return fetch.get('/api/web/chroma/documents', { 
        params: { collection, ...params } 
    });
}

/**
 * 删除文档
 */
export function deleteChromaDocument(collection: string, id: string) {
    return fetch.delete('/api/web/chroma/documents', { 
        params: { collection, id } 
    });
}

/**
 * 查询文档（相似度搜索）
 */
export function queryChromaDocuments(params: {
    collection: string;
    queryText: string;
    nResults?: number;
    where?: Record<string, any>;
}) {
    return fetch.post('/api/web/chroma/query', params);
}

/**
 * 获取 collection 中所有文档的 metadata
 * @param type - 类型: character | event | faction | geo | chapter
 * @param worldviewId - 世界观 ID
 * @param limit - 最大返回数量，默认 1000
 */
export function fetchChromaMetadata(params: {
    type: 'character' | 'event' | 'faction' | 'geo' | 'chapter';
    worldview_id: number | string;
    limit?: number;
}) {
    return fetch.get('/api/web/chroma/metadata', { params });
}

/**
 * 获取自定义 collection 中所有文档的 metadata
 * @param collection - collection 名称
 * @param limit - 最大返回数量，默认 1000
 */
export function fetchChromaCollectionMetadata(collection: string, limit?: number) {
    return fetch.get('/api/web/chroma/metadata', { 
        params: { collection, limit } 
    });
}
