import { MysqlNovalService } from '@/src/utils/mysql/service';

/**
 * 世界态 Service
 * 表：world_state，主键：id
 * 非开源 BaseService，继承自项目内 MysqlNovalService
 */
export default class WorldStateService extends MysqlNovalService {
  constructor() {
    super('world_state', 'id');

    this.setValidColumns([
      'id',
      'worldview_id',
      'state_type',
      'title',
      'description',
      'status',
      'start_time',
      'end_time',
      'duration_days',
      'related_faction_ids',
      'related_role_ids',
      'related_geo_codes',
      'related_event_ids',
      'related_chapter_ids',
      'related_world_state_ids',
      'impact_level',
      'impact_description',
      'affected_areas',
      'tags',
      'created_at',
      'updated_at',
      'created_by',
    ]);
  }

  /**
   * 按世界观及筛选条件分页查询列表
   * @param {Object} params
   * @param {number} params.worldview_id
   * @param {string} [params.state_type]
   * @param {string} [params.status]
   * @param {string} [params.impact_level]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=20]
   */
  async getList(params) {
    const { worldview_id, state_type, status, impact_level, page = 1, limit = 20 } = params;
    const condition = { worldview_id };
    if (state_type != null && state_type !== '') condition.state_type = state_type;
    if (status != null && status !== '') condition.status = status;
    if (impact_level != null && impact_level !== '') condition.impact_level = impact_level;
    return this.query(condition, [], ['id asc'], page, limit);
  }
}
