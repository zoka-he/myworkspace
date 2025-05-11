import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class FactionDefService extends MysqlNovalService {

    constructor() {
        super('timeline_events', ['id']);

        this.setValidColumns([
            'id',
            'title',
            'description',
            'date',
            'location',
            'faction_ids',
            'role_ids',
            'story_line_id',
            'worldview_id'
        ]);
    }

}

