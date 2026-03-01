import { MysqlNovalService } from "@/src/utils/mysql/service";
import _ from 'lodash';

export default class RaceDefService extends MysqlNovalService {

    constructor() {
        super('Race', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'name',
            'description',
            'parent_id',
            'order_num',
            'embed_document',
            'appearance',
            'lifespan',
            'traits',
            'weaknesses',
            'naming_habit',
            'customs',
            'chroma_collection',
            'chroma_doc_id',
        ]);
    }

    /**
     * 检查是否存在子亚种（存在 parent_id = raceId 的记录）
     */
    async hasChildren(raceId) {
        const { data } = await this.query({ parent_id: raceId }, [], ['id asc'], 1, 1, true);
        return (data && data.length > 0);
    }

    /**
     * 检查是否有角色引用该族群（role_info.race_id = raceId）
     */
    async countRoleReferences(raceId) {
        const result = await this.queryBySql(
            'SELECT COUNT(0) AS cnt FROM role_info WHERE race_id = ?',
            [raceId]
        );
        return (result && result[0] && result[0].cnt) ? Number(result[0].cnt) : 0;
    }

    async getRaceDocumentByIds(ids) {
        if (!ids || ids.length === 0) return { data: [] };
        const sql = `
            SELECT id, worldview_id, name title, embed_document document, MD5(COALESCE(embed_document, '')) fingerprint
            FROM Race WHERE id IN (${ids.join(',')})
        `;
        const ret = await this.queryBySql(sql, []);
        return { data: ret || [] };
    }
}
