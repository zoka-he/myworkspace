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
                tl.hour_length_in_seconds as tl_hour_length_in_seconds,
                tl.day_length_in_hours as tl_day_length_in_hours,
                tl.month_length_in_days as tl_month_length_in_days,
                tl.year_length_in_months as tl_year_length_in_months
            FROM WorldView wv
            LEFT JOIN timeline tl ON wv.id = tl.worldview_id
            WHERE wv.title LIKE ?
        `;

        const params = [title ? `%${title}%` : '%'];

        return this.query(sql, params, ['id asc'], page, limit);
    }

}