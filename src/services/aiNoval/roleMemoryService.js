import { MysqlNovalService } from '@/src/utils/mysql/service';

const IMPORTANCE_ORDER = ['critical', 'high', 'medium', 'low', 'marginal'];
const IMPORTANCE_FIELD = "FIELD(importance, 'critical','high','medium','low','marginal')";

/**
 * 角色记忆 Service
 * 表：role_memory
 */
export default class RoleMemoryService extends MysqlNovalService {
  constructor() {
    super('role_memory', 'id');

    this.setValidColumns([
      'id',
      'worldview_id',
      'role_info_id',
      'chapter_id',
      'scope',
      'start_chapter_id',
      'end_chapter_id',
      'content',
      'impact_summary',
      'importance',
      'memory_type',
      'affects_slot',
      'affects_slots',
      'related_role_info_id',
      'narrative_usage',
      'sort_order',
      'created_at',
      'updated_at',
    ]);
  }

  /**
   * 分页列表，按世界观与角色过滤，支持槽位/类型/重要性筛选
   * importance_min：只返回重要性不低于该值的记录（词汇：critical/high/medium/low/marginal）
   */
  async getList(params) {
    const {
      worldview_id,
      role_info_id,
      affects_slot,
      memory_type,
      related_role_info_id,
      importance_min,
      page = 1,
      limit = 50,
    } = params;
    const condition = { worldview_id };
    if (role_info_id != null) condition.role_info_id = role_info_id;
    if (affects_slot != null && affects_slot !== '') condition.affects_slot = affects_slot;
    if (memory_type != null && memory_type !== '') condition.memory_type = memory_type;
    if (related_role_info_id != null) condition.related_role_info_id = related_role_info_id;
    if (importance_min != null && importance_min !== '' && IMPORTANCE_ORDER.includes(importance_min)) {
      const idx = IMPORTANCE_ORDER.indexOf(importance_min);
      condition.importance = { $in: IMPORTANCE_ORDER.slice(0, idx + 1) };
    }
    const order = [`${IMPORTANCE_FIELD} asc`, 'sort_order asc', 'id asc'];
    return this.query(condition, [], order, page, limit);
  }

  /**
   * MCP/按需引用：按角色、可选章节号、重要性与槽位过滤
   * importance_min：词汇（critical/high/medium/low/marginal），只返回重要性不低于该值的记录
   */
  async getListForMcp(params) {
    const {
      worldview_id,
      role_info_id,
      chapter_number,
      importance_min = 'high',
      affects_slot,
      memory_type,
      related_role_info_id,
      limit = 20,
    } = params;
    if (!worldview_id || !role_info_id) {
      return { data: [], count: 0 };
    }
    const impMin = IMPORTANCE_ORDER.includes(importance_min) ? importance_min : 'high';
    const values = [worldview_id, role_info_id];
    const conds = [
      'rm.worldview_id = ?',
      'rm.role_info_id = ?',
      `(${IMPORTANCE_FIELD} <= ${IMPORTANCE_ORDER.indexOf(impMin) + 1})`,
    ];
    let scopeCond;
    if (chapter_number != null && chapter_number !== '' && Number.isFinite(Number(chapter_number))) {
      const num = Number(chapter_number);
      scopeCond = "(rm.scope = 'global' OR (rm.scope = 'at_chapter' AND c_at.chapter_number = ?) OR (rm.scope = 'from_chapter' AND c_start.chapter_number <= ? AND (c_end.id IS NULL OR c_end.chapter_number >= ?)))";
      values.push(num, num, num);
    } else {
      scopeCond = "(rm.scope = 'global' OR rm.scope = 'from_chapter')";
    }
    if (affects_slot != null && affects_slot !== '') {
      conds.push('(rm.affects_slot = ? OR JSON_CONTAINS(COALESCE(rm.affects_slots, "[]"), ?) = 1)');
      values.push(affects_slot, JSON.stringify(affects_slot));
    }
    if (memory_type != null && memory_type !== '') {
      conds.push('rm.memory_type = ?');
      values.push(memory_type);
    }
    if (related_role_info_id != null) {
      conds.push('rm.related_role_info_id = ?');
      values.push(related_role_info_id);
    }
    const whereClause = conds.join(' AND ');
    const limitVal = Math.min(Number(limit) || 20, 50);
    const joins =
      chapter_number != null && chapter_number !== ''
        ? `
      LEFT JOIN \`chapter\` c_at ON c_at.id = rm.chapter_id AND rm.scope = 'at_chapter'
      LEFT JOIN \`chapter\` c_start ON c_start.id = rm.start_chapter_id AND rm.scope = 'from_chapter'
      LEFT JOIN \`chapter\` c_end ON c_end.id = rm.end_chapter_id AND rm.scope = 'from_chapter'
    `
        : '';
    const sql = `
      SELECT rm.*
      FROM role_memory rm
      ${joins}
      WHERE ${whereClause} AND ${scopeCond}
      ORDER BY ${IMPORTANCE_FIELD} ASC, rm.sort_order ASC, rm.id ASC
      LIMIT ?
    `;
    values.push(limitVal);
    const data = await this.queryBySql(sql, values);
    return { data: data || [], count: (data || []).length };
  }
}
