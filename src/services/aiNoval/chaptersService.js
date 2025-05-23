import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class ChaptersService extends MysqlNovalService {

    constructor() {
        super('chapters', ['id']);

        this.setValidColumns([
            'id',
            'novel_id',
            'chapter_number',
            'version',
            'title',
            'worldview_id',
            'storyline_ids',
            'event_ids',
            'event_line_start1',
            'event_line_end1',
            'event_line_start2',
            'event_line_end2',
            'geo_ids',
            'role_ids',
            'faction_ids',
            'content',
            'seed_prompt',
            'skeleton_prompt',
            'created_at',
            'updated_at'
        ]);
    }

    async getMaxChapterNumber(novelId) {
        const result = await this.query('SELECT MAX(chapter_number) max_chapter_number FROM chapters WHERE novel_id = ?', [novelId]);
        return result.data[0].max_chapter_number;
    }

    // 获取章节列表基础信息
    async getChapterListBaseInfo(novelId, page = 1, limit = 20) {
        const result = await this.query(
            'SELECT id, chapter_number, version, title, event_ids FROM chapters WHERE novel_id = ?', [novelId],
            ['chapter_number asc', 'version asc'],
            page,
            limit
        );
        return result;
    }

}