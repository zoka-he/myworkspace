import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class WorldViewManageService extends MysqlNovalService {

    constructor() {
        super('WorldView', ['id']);

        this.setValidColumns([
            'id',
            'title',
            'content',
            'is_dify_knowledge_base'
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
                tl.year_length_in_months as tl_year_length_in_months
            FROM WorldView wv
            LEFT JOIN (
                SELECT 
                    tl_min.id,
                    tl_min.worldview_id,
                	tl_def.epoch,
                    tl_def.start_seconds,
                    tl_def.hour_length_in_seconds,
                    tl_def.day_length_in_hours,
                    tl_def.month_length_in_days,
                    tl_def.year_length_in_months
                FROM (
                    SELECT 
                        id,
	                    worldview_id, 
	                    MIN(start_seconds) as min_start_seconds 
                    FROM timeline GROUP BY id, worldview_id ORDER BY min_start_seconds ASC LIMIT 1
                ) AS tl_min
                LEFT JOIN 
                    timeline tl_def ON tl_min.id = tl_def.id
            ) tl ON wv.id = tl.worldview_id
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
                tl.year_length_in_months as tl_year_length_in_months
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

}