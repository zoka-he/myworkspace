/**
 * Chroma 向量数据库配置
 */

const chromaConfig = {
    // Chroma 服务地址
    CHROMA_URL: process.env.CHROMA_URL || 'http://localhost:28005',
    
    // 硅基流动 API 配置 (用于生成向量嵌入)
    EMBEDDING_API_KEY: process.env.SILICONFLOW_API_KEY,
    EMBEDDING_BASE_URL: process.env.EMBEDDING_BASE_URL || 'https://api.siliconflow.cn/v1',
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || 'BAAI/bge-m3',

    // 集合名称定义
    COLLECTIONS: {
        // 章节内容向量集合
        CHAPTERS: 'novel_chapters',
        // 角色信息向量集合  
        ROLES: 'novel_roles',
        // 世界观内容向量集合
        WORLDVIEWS: 'novel_worldviews',
        // 时间线事件向量集合
        TIMELINE_EVENTS: 'novel_timeline_events',
        // 地理位置向量集合
        GEO_LOCATIONS: 'novel_geo_locations',
        // 势力/阵营向量集合
        FACTIONS: 'novel_factions',
    }
};

// 生产环境配置
if (process.env.NODE_ENV === 'production') {
    chromaConfig.CHROMA_URL = process.env.CHROMA_URL || 'http://host.docker.internal:28005';
}

export default chromaConfig;
