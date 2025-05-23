import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class ChapterEventRelationService extends MysqlNovalService {

    constructor() {
        super('chapter_event_relation', ['chapter_id', 'event_id']);

        this.setValidColumns([
            'chapter_id',
            'event_id',
        ]);
    }

    async deleteByChapterId(chapterId) {
        await super.deleteMany({ chapter_id: chapterId });
    }

}