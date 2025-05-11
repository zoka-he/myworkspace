import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class StoryLineService extends MysqlNovalService {

    constructor() {
        super('story_line', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'name',
            'type',
            'description'
        ]);
    }

}