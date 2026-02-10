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

  /** 允许用于排序的列 */
  static SORTABLE_COLUMNS = ['impact_level', 'status', 'id'];

  /**
   * 按世界观及筛选条件分页查询列表
   * @param {Object} params
   * @param {number} params.worldview_id
   * @param {string} [params.state_type]
   * @param {string} [params.status]
   * @param {string} [params.impact_level]
   * @param {string} [params.sort_by] 排序字段：impact_level | status | id
   * @param {string} [params.sort_order] 排序方向：asc | desc
   * @param {number} [params.page=1]
   * @param {number} [params.limit=20]
   */
  async getList(params) {
    const {
      worldview_id,
      state_type,
      status,
      impact_level,
      sort_by,
      sort_order = 'desc',
      page = 1,
      limit = 20,
    } = params;
    const condition = { worldview_id };
    if (state_type != null && state_type !== '') condition.state_type = state_type;
    if (status != null && status !== '') condition.status = status;
    if (impact_level != null && impact_level !== '') condition.impact_level = impact_level;

    const orderDir = sort_order === 'desc' ? 'desc' : 'asc';
    let orderExpr = 'id asc';
    if (
      sort_by != null &&
      sort_by !== '' &&
      WorldStateService.SORTABLE_COLUMNS.includes(String(sort_by))
    ) {
      if (sort_by === 'impact_level') {
        // 语义顺序：低 -> 中 -> 高 -> 关键；用 FIELD 指定顺序，再 asc/desc
        orderExpr = `FIELD(impact_level, 'low', 'medium', 'high', 'critical') ${orderDir}`;
      } else {
        orderExpr = `${sort_by} ${orderDir}`;
      }
    }
    const order = [orderExpr, 'id asc'];

    return this.query(condition, [], order, page, limit);
  }

  /**
   * MCP 专用：获取世界态列表，将 faction_id、role_id、geo_code 转为名称字段（一条 SQL 完成）
   * 返回每条记录含 related_faction_names、related_role_names、related_geo_names
   * @param {Object} params 同 getList
   */
  async getListForMcp(params) {
    const { worldview_id, state_type, status, impact_level, page = 1, limit = 20 } = params;
    const values = [];
    const conditions = ['ws.worldview_id = ?'];
    values.push(worldview_id);
    if (state_type != null && state_type !== '') {
      conditions.push('ws.state_type = ?');
      values.push(state_type);
    }
    if (status != null && status !== '') {
      conditions.push('ws.status = ?');
      values.push(status);
    }
    if (impact_level != null && impact_level !== '') {
      conditions.push('ws.impact_level = ?');
      values.push(impact_level);
    }
    const whereClause = conditions.join(' AND ');

    const jsonArray = (col) => `IF(ws.${col} IS NULL OR ws.${col} = '' OR ws.${col} = 'null', '[]', ws.${col})`;
    const sql = `
SELECT ws.*,
  (SELECT GROUP_CONCAT(f.name ORDER BY f.id)
   FROM \`Faction\` f
   WHERE f.worldview_id = ws.worldview_id
     AND JSON_CONTAINS(${jsonArray('related_faction_ids')}, CAST(f.id AS JSON), '$')) AS related_faction_names,
  (SELECT GROUP_CONCAT(ri.name_in_worldview ORDER BY r.id)
   FROM \`Role\` r
   INNER JOIN role_info ri ON ri.role_id = r.id AND ri.id = r.version
   WHERE ri.worldview_id = ws.worldview_id
     AND JSON_CONTAINS(${jsonArray('related_role_ids')}, CAST(r.id AS JSON), '$')) AS related_role_names,
  (SELECT GROUP_CONCAT(geo_sub.name ORDER BY geo_sub.code)
   FROM (
     SELECT code, name FROM geo_star_system
     WHERE worldview_id = ws.worldview_id AND JSON_CONTAINS(${jsonArray('related_geo_codes')}, JSON_QUOTE(COALESCE(code, '')), '$')
     UNION ALL
     SELECT code, name FROM geo_star
     WHERE worldview_id = ws.worldview_id AND JSON_CONTAINS(${jsonArray('related_geo_codes')}, JSON_QUOTE(COALESCE(code, '')), '$')
     UNION ALL
     SELECT code, name FROM geo_planet
     WHERE worldview_id = ws.worldview_id AND JSON_CONTAINS(${jsonArray('related_geo_codes')}, JSON_QUOTE(COALESCE(code, '')), '$')
     UNION ALL
     SELECT code, name FROM geo_satellite
     WHERE worldview_id = ws.worldview_id AND JSON_CONTAINS(${jsonArray('related_geo_codes')}, JSON_QUOTE(COALESCE(code, '')), '$')
     UNION ALL
     SELECT code, name FROM geo_geography_unit
     WHERE worldview_id = ws.worldview_id AND JSON_CONTAINS(${jsonArray('related_geo_codes')}, JSON_QUOTE(COALESCE(code, '')), '$')
   ) geo_sub) AS related_geo_names
FROM world_state ws
WHERE ${whereClause}
ORDER BY ws.id ASC
LIMIT ?, ?
`;
    const countSql = `
SELECT COUNT(0) AS count FROM world_state ws WHERE ${whereClause}
`;
    const countValues = values.slice();
    values.push((page - 1) * limit, limit);

    const debugTag = '[WorldStateService.getListForMcp]';

    try {
      const debugSql = `SELECT ws.id, ws.related_faction_ids, ws.related_role_ids, ws.related_geo_codes FROM world_state ws WHERE ${whereClause} ORDER BY ws.id ASC LIMIT ?`;
      const debugValues = countValues.slice();
      debugValues.push(limit);
      const rawRows = await this.queryBySql(debugSql, debugValues);
      console.log(debugTag, 'DEBUG 原始列: 共', Array.isArray(rawRows) ? rawRows.length : 0, '行');
      if (Array.isArray(rawRows)) {
        rawRows.forEach((row, idx) => {
          const inspect = (val) => {
            const t = typeof val;
            const isNull = val === null || val === undefined;
            let len = '';
            let preview = '';
            let parseOk = '';
            if (isNull) {
              preview = 'value=null';
              parseOk = 'n/a';
            } else if (t === 'string') {
              len = `length=${val.length}`;
              preview = `preview=${JSON.stringify(val.slice(0, 100))}${val.length > 100 ? '...' : ''}`;
              try {
                JSON.parse(val);
                parseOk = 'JSON.parse=ok';
              } catch (e) {
                parseOk = `JSON.parse=FAIL: ${e.message}`;
              }
            } else if (t === 'object') {
              try {
                const s = JSON.stringify(val);
                len = `stringify.length=${s.length}`;
                preview = `preview=${s.slice(0, 100)}${s.length > 100 ? '...' : ''}`;
                parseOk = 'driver returned object (already parsed)';
              } catch (e) {
                parseOk = `stringify error: ${e.message}`;
              }
            } else {
              preview = `value=${String(val)} (typeof=${t})`;
              parseOk = 'n/a';
            }
            return { t, isNull, len, preview, parseOk };
          };
          console.log(debugTag, `  row[${idx}] id=${row.id}`);
          ['related_faction_ids', 'related_role_ids', 'related_geo_codes'].forEach((col) => {
            const info = inspect(row[col]);
            console.log(debugTag, `    ${col}: typeof=${info.t} null=${info.isNull} ${info.len} ${info.preview} ${info.parseOk}`);
          });
        });
      }

      const [data, countRows] = await Promise.all([
        this.queryBySql(sql, values),
        this.queryBySql(countSql, countValues),
      ]);
      const count = countRows && countRows[0] ? Number(countRows[0].count) : 0;
      const list = Array.isArray(data) ? data : [];
      return { data: list, count };
    } catch (err) {
      console.error(debugTag, 'SQL 执行失败 message:', err?.message ?? String(err));
      console.error(debugTag, 'SQL 执行失败 stack:', err?.stack);
      if (err?.code) console.error(debugTag, 'err.code:', err.code);
      if (err?.sqlMessage) console.error(debugTag, 'err.sqlMessage:', err.sqlMessage);
      if (err?.sql) console.error(debugTag, 'err.sql:', err.sql);
      return { data: [], count: 0 };
    }
  }
}
