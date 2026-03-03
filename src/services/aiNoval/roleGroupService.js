import { MysqlNovalService } from "@/src/utils/mysql/service";
import _ from 'lodash';

export default class RoleGroupService extends MysqlNovalService {

    constructor() {
        super('role_group', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'name',
            'description',
            'collective_behavior',
            'group_type',
            'group_status',
            'sort_order',
            'decision_style',
            'conflict_points',
            'accord_points',
            'action_pattern',
            'group_style',
            'shared_goal',
            'taboo',
            'situation_responses',
            'group_mannerisms',
            'group_type_notes',
            'status_since',
            'status_notes',
            'created_at',
            'updated_at',
        ]);
    }

    /**
     * 按世界观查询角色组列表（支持分页、按状态筛选）
     */
    async listByWorldview(worldviewId, opts = {}) {
        const { page = 1, limit = 100, group_status } = opts;
        const cond = { worldview_id: _.toNumber(worldviewId) };
        if (group_status) cond.group_status = group_status;
        return this.query(cond, [], ['sort_order asc', 'id asc'], page, limit);
    }
}
