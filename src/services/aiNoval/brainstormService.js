import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class BrainstormService extends MysqlNovalService {

    constructor() {
        super('brainstorm', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'novel_id',
            'brainstorm_type',
            'title',
            'content',
            'status',
            'priority',
            'category',
            'tags',
            'related_faction_ids',
            'related_role_ids',
            'related_geo_codes',
            'related_event_ids',
            'related_chapter_ids',
            'related_world_state_ids',
            'parent_id',
            'analysis_status',
            'analysis_result',
            'analyzed_at',
            'analysis_model',
            'created_at',
            'updated_at',
            'created_by'
        ]);
    }

    /**
     * 获取脑洞列表（支持全文搜索）
     * @param {Object} params - 查询参数
     * @param {number} params.worldview_id - 世界观ID
     * @param {string} params.search - 搜索关键词（全文搜索）
     * @param {string} params.brainstorm_type - 脑洞类型
     * {string|string[]} params.status - 状态（支持多选）
     * @param {string} params.priority - 优先级
     * @param {string} params.category - 分类
     * @param {number} params.parent_id - 父脑洞ID
     * @param {number} page - 页码
     * @param {number} limit - 每页数量
     */
    async getBrainstormList(params = {}, page = 1, limit = 20) {
        const conditions = [];
        const values = [];

        // 世界观ID（必需）
        if (params.worldview_id) {
            conditions.push('worldview_id = ?');
            values.push(params.worldview_id);
        }

        // 全文搜索
        if (params.search) {
            conditions.push('MATCH(title, content) AGAINST(? IN NATURAL LANGUAGE MODE)');
            values.push(params.search);
        }

        // 脑洞类型
        if (params.brainstorm_type) {
            conditions.push('brainstorm_type = ?');
            values.push(params.brainstorm_type);
        }

        // 状态（支持多选）
        if (params.status) {
            if (Array.isArray(params.status)) {
                if (params.status.length > 0) {
                    conditions.push(`status IN (${params.status.map(() => '?').join(',')})`);
                    values.push(...params.status);
                }
            } else {
                conditions.push('status = ?');
                values.push(params.status);
            }
        }

        // 优先级
        if (params.priority) {
            conditions.push('priority = ?');
            values.push(params.priority);
        }

        // 分类
        if (params.category) {
            conditions.push('category = ?');
            values.push(params.category);
        }

        // 父脑洞ID
        if (params.parent_id !== undefined) {
            if (params.parent_id === null) {
                conditions.push('parent_id IS NULL');
            } else {
                conditions.push('parent_id = ?');
                values.push(params.parent_id);
            }
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const sql = `SELECT * FROM brainstorm ${whereClause}`;

        return this.query(sql, values, ['created_at DESC'], page, limit);
    }

    /**
     * 根据ID获取脑洞详情
     * @param {number} id - 脑洞ID
     */
    async getBrainstormById(id) {
        const result = await this.query({ id }, [], ['id asc'], 1, 1);
        return result.data[0] || null;
    }

    /**
     * 创建脑洞
     * @param {Object} data - 脑洞数据
     */
    async createBrainstorm(data) {
        const verifiedData = this.verifyInsertOrUpdate(data);
        return this.insertOne(verifiedData);
    }

    /**
     * 更新脑洞
     * @param {number} id - 脑洞ID
     * @param {Object} data - 要更新的数据
     */
    async updateBrainstorm(id, data) {
        const verifiedData = this.verifyInsertOrUpdate(data);
        return this.updateOne({ id }, verifiedData);
    }

    /**
     * 删除脑洞
     * @param {number} id - 脑洞ID
     */
    async deleteBrainstorm(id) {
        return this.deleteOne({ id });
    }

    /**
     * 更新分析结果
     * @param {number} id - 脑洞ID
     * @param {Object} analysisResult - 分析结果
     * @param {string} analysisModel - 使用的LLM模型
     */
    async updateAnalysisResult(id, analysisResult, analysisModel = 'deepseek-chat') {
        return this.updateOne(
            { id },
            {
                analysis_status: 'completed',
                analysis_result: JSON.stringify(analysisResult),
                analyzed_at: new Date(),
                analysis_model: analysisModel
            }
        );
    }

    /**
     * 更新分析状态
     * @param {number} id - 脑洞ID
     * @param {string} status - 分析状态（pending/analyzing/completed/failed）
     */
    async updateAnalysisStatus(id, status) {
        return this.updateOne({ id }, { analysis_status: status });
    }

    /**
     * 获取子脑洞列表
     * @param {number} parentId - 父脑洞ID
     * @param {number} page - 页码
     * @param {number} limit - 每页数量
     */
    async getChildBrainstorms(parentId, page = 1, limit = 20) {
        return this.query({ parent_id: parentId }, [], ['created_at DESC'], page, limit);
    }

    /**
     * 批量更新状态
     * @param {number[]} ids - 脑洞ID数组
     * @param {string} status - 新状态
     */
    async batchUpdateStatus(ids, status) {
        if (!ids || ids.length === 0) {
            return { affectedRows: 0 };
        }
        const sql = `UPDATE brainstorm SET status = ? WHERE id IN (${ids.map(() => '?').join(',')})`;
        const values = [status, ...ids];
        const result = await this.getBaseApi().execute(sql, values);
        return { affectedRows: result[0].affectedRows };
    }

    /**
     * 批量更新标签
     * @param {number[]} ids - 脑洞ID数组
     * @param {string[]} tags - 新标签数组
     */
    async batchUpdateTags(ids, tags) {
        if (!ids || ids.length === 0) {
            return { affectedRows: 0 };
        }
        const tagsJson = JSON.stringify(tags);
        const sql = `UPDATE brainstorm SET tags = ? WHERE id IN (${ids.map(() => '?').join(',')})`;
        const values = [tagsJson, ...ids];
        const result = await this.getBaseApi().execute(sql, values);
        return { affectedRows: result[0].affectedRows };
    }

    /**
     * 获取统计信息
     * @param {number} worldviewId - 世界观ID
     */
    async getStatistics(worldviewId) {
        const sql = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_count,
                SUM(CASE WHEN status = 'feasible_unused' THEN 1 ELSE 0 END) as feasible_unused_count,
                SUM(CASE WHEN status = 'in_use' THEN 1 ELSE 0 END) as in_use_count,
                SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) as used_count,
                SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_count,
                SUM(CASE WHEN analysis_status = 'completed' THEN 1 ELSE 0 END) as analyzed_count
            FROM brainstorm
            WHERE worldview_id = ?
        `;
        const result = await this.query(sql, [worldviewId], [], 1, 1);
        return result.data[0] || {};
    }

}
