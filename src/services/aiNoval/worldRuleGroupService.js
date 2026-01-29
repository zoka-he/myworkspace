import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class WorldRuleGroupService extends MysqlNovalService {

    constructor() {
        super('world_rule_group', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'title',
            'parent_id',
            'order',
            'content',
            'created_at',
            'updated_at'
        ]);
    }
}