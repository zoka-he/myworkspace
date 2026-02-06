import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class BrainstormAnalysisHistoryService extends MysqlNovalService {

    constructor() {
        super('brainstorm_analysis_history', ['id']);

        this.setValidColumns([
            'id',
            'brainstorm_id',
            'analysis_result',
            'analysis_model',
            'analyzed_at'
        ]);
    }

    /**
     * 创建分析历史记录
     * @param {Object} data - 分析历史数据
     * @param {number} data.brainstorm_id - 脑洞ID
     * @param {Object} data.analysis_result - 分析结果
     * @param {string} data.analysis_model - 使用的LLM模型
     */
    async createHistory(data) {
        const verifiedData = {
            brainstorm_id: data.brainstorm_id,
            analysis_result: JSON.stringify(data.analysis_result),
            analysis_model: data.analysis_model || 'deepseek-chat',
            analyzed_at: data.analyzed_at || new Date()
        };
        return this.insertOne(verifiedData);
    }

    /**
     * 获取脑洞的分析历史列表
     * @param {number} brainstormId - 脑洞ID
     * @param {number} page - 页码
     * @param {number} limit - 每页数量
     */
    async getHistoryByBrainstormId(brainstormId, page = 1, limit = 20) {
        const result = await this.query(
            { brainstorm_id: brainstormId },
            ['analyzed_at DESC'],
            page,
            limit
        );
        
        // 解析 JSON 字段
        if (result.data) {
            result.data = result.data.map(item => ({
                ...item,
                analysis_result: typeof item.analysis_result === 'string' 
                    ? JSON.parse(item.analysis_result) 
                    : item.analysis_result
            }));
        }
        
        return result;
    }

    /**
     * 获取最新的分析历史记录
     * @param {number} brainstormId - 脑洞ID
     */
    async getLatestHistory(brainstormId) {
        const result = await this.query(
            { brainstorm_id: brainstormId },
            ['analyzed_at DESC'],
            1,
            1
        );
        
        if (result.data && result.data.length > 0) {
            const item = result.data[0];
            return {
                ...item,
                analysis_result: typeof item.analysis_result === 'string' 
                    ? JSON.parse(item.analysis_result) 
                    : item.analysis_result
            };
        }
        
        return null;
    }

    /**
     * 根据ID获取分析历史记录
     * @param {number} id - 历史记录ID
     */
    async getHistoryById(id) {
        const result = await this.query({ id }, [], ['id asc'], 1, 1);
        
        if (result.data && result.data.length > 0) {
            const item = result.data[0];
            return {
                ...item,
                analysis_result: typeof item.analysis_result === 'string' 
                    ? JSON.parse(item.analysis_result) 
                    : item.analysis_result
            };
        }
        
        return null;
    }

    /**
     * 删除分析历史记录
     * @param {number} id - 历史记录ID
     */
    async deleteHistory(id) {
        return this.delete({ id });
    }

    /**
     * 删除脑洞的所有分析历史记录
     * @param {number} brainstormId - 脑洞ID
     */
    async deleteHistoryByBrainstormId(brainstormId) {
        return this.delete({ brainstorm_id: brainstormId });
    }

    /**
     * 获取分析历史统计信息
     * @param {number} brainstormId - 脑洞ID（可选）
     */
    async getStatistics(brainstormId = null) {
        let sql = `
            SELECT 
                COUNT(*) as total_count,
                COUNT(DISTINCT brainstorm_id) as unique_brainstorm_count,
                MAX(analyzed_at) as latest_analysis_time
            FROM brainstorm_analysis_history
        `;
        const values = [];
        
        if (brainstormId) {
            sql += ' WHERE brainstorm_id = ?';
            values.push(brainstormId);
        }
        
        const result = await this.query(sql, values, [], 1, 1);
        return result.data[0] || {};
    }

}
