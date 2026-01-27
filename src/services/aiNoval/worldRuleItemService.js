import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class WorldRuleItemService extends MysqlNovalService {

    constructor() {
        super('world_rule_item', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'group_id',
            'summary',
            'content',
            'order',
            'created_at',
            'updated_at'
        ]);
    }
}