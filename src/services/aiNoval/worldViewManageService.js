import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class WorldViewManageService extends MysqlNovalService {

    constructor() {
        super('WorldView', ['id']);

        this.setValidColumns([
            'id',
            'title',
            'content',
            'is_dify_knowledge_base',
            'worldrule_snapshot_id'
        ]);
    }

    async getWorldViewListWithExtraDatas(title, page = 1, limit = 10) {
        const sql = `
            SELECT 
                wv.id as id,
                wv.title as title,
                wv.content as content,
                wv.is_dify_knowledge_base,
                tl.id as tl_id,
                tl.epoch as tl_epoch,
                tl.start_seconds as tl_start_seconds,
                te.max_date as te_max_seconds,
                tl.hour_length_in_seconds as tl_hour_length_in_seconds,
                tl.day_length_in_hours as tl_day_length_in_hours,
                tl.month_length_in_days as tl_month_length_in_days,
                tl.year_length_in_months as tl_year_length_in_months,
                tl.base_seconds as tl_base_seconds,
                wv.worldrule_snapshot_id as worldrule_snapshot_id
            FROM WorldView wv
            LEFT JOIN timeline tl ON wv.base_timeline_id = tl.id
            LEFT JOIN (
                SELECT worldview_id, MAX(date) as max_date FROM timeline_events GROUP BY worldview_id
            ) te ON wv.id = te.worldview_id
            WHERE wv.title LIKE ?
        `;

        const params = [title ? `%${title}%` : '%'];

        return this.query(sql, params, ['id asc'], page, limit);
    }

    async getWorldViewById(id) {
        const sql = `
            SELECT 
                wv.id as id,
                wv.title as title,
                wv.content as content,
                wv.is_dify_knowledge_base,
                tl.id as tl_id,
                tl.epoch as tl_epoch,
                tl.start_seconds as tl_start_seconds,
                te.max_date as te_max_seconds,
                tl.hour_length_in_seconds as tl_hour_length_in_seconds,
                tl.day_length_in_hours as tl_day_length_in_hours,
                tl.month_length_in_days as tl_month_length_in_days,
                tl.year_length_in_months as tl_year_length_in_months,
                wv.worldrule_snapshot_id as worldrule_snapshot_id
            FROM WorldView wv
            LEFT JOIN timeline tl ON wv.id = tl.worldview_id
            LEFT JOIN (
                SELECT worldview_id, MAX(date) as max_date FROM timeline_events GROUP BY worldview_id
            ) te ON wv.id = te.worldview_id
            WHERE wv.id = ?
        `;

        const params = [id];

        return this.query(sql, params, ['id asc'], page, limit);    
    }

    async getWorldViewDocumentByIds(ids) {
        let sql = `
            select 
                id, 
                title, 
                concat_ws('|', title, content) document, 
                md5(concat_ws('|', title, content)) fingerprint
            from WorldView
            where id in(${ids.join(',')})
        `;
        return this.query(sql, [], ['id asc'], 1, ids.length);
    }

}