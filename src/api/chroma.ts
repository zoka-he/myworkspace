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
