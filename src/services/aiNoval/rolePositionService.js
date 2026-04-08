import { MysqlNovalService } from '@/src/utils/mysql/service';

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, Number(v) || 0));
}

function parseJsonField(row, key, fallback) {
  const ret = { ...row };
  if (ret[key] == null) return ret;
  if (typeof ret[key] === 'string') {
    try {
      ret[key] = JSON.parse(ret[key]);
    } catch {
      ret[key] = fallback;
    }
  }
  return ret;
}

export default class RolePositionService extends MysqlNovalService {
  constructor() {
    super('role_position_timeline', ['id']);
    this.setValidColumns([
      'id',
      'worldview_id',
      'role_id',
      'role_info_id',
      'geo_code',
      'occurred_at',
      'leave_at',
      'distance_from_prev_km',
      'travel_mode',
      'travel_mode_desc',
      'move_purpose',
      'stay_leave_intent_score',
      'intent_reason',
      'stay_cost_score',
      'leave_cost_score',
      'stay_cost_reason',
      'leave_cost_reason',
      'desired_geo_codes',
      'desired_reason',
      'via_geo_codes',
      'move_decision_factors',
      'decision_reason',
      'validation_snapshot',
      'note',
      'created_by',
      'source',
      'is_deleted',
      'created_at',
      'updated_at',
    ]);
  }

  stringifyPayload(payload = {}) {
    const body = { ...payload };
    ['desired_geo_codes', 'via_geo_codes', 'move_decision_factors', 'validation_snapshot'].forEach((k) => {
      if (body[k] != null && typeof body[k] !== 'string') {
        body[k] = JSON.stringify(body[k]);
      }
    });
    return body;
  }

  parseRow(row) {
    let ret = { ...row };
    ret = parseJsonField(ret, 'desired_geo_codes', []);
    ret = parseJsonField(ret, 'via_geo_codes', []);
    ret = parseJsonField(ret, 'move_decision_factors', {});
    ret = parseJsonField(ret, 'validation_snapshot', null);
    return ret;
  }

  async getList(params = {}) {
    const {
      worldview_id,
      role_id,
      role_info_id,
      page = 1,
      limit = 100,
    } = params;
    const cond = {
      worldview_id,
      is_deleted: 0,
    };
    if (role_id != null) cond.role_id = role_id;
    if (role_info_id != null) cond.role_info_id = role_info_id;
    const rs = await this.query(cond, [], ['occurred_at desc', 'id desc'], page, limit);
    rs.data = (rs.data || []).map((row) => this.parseRow(row));
    return rs;
  }

  async getById(id) {
    const row = await this.queryOne({ id: Number(id), is_deleted: 0 });
    return row ? this.parseRow(row) : null;
  }

  async getPrevRecord({ worldview_id, role_id, occurred_at, currentId }) {
    const values = [Number(worldview_id), Number(role_id), Number(occurred_at)];
    let extra = '';
    if (currentId != null) {
      extra = ' and id != ?';
      values.push(Number(currentId));
    }
    const sql = `
      select * from role_position_timeline
      where worldview_id = ?
        and role_id = ?
        and is_deleted = 0
        and occurred_at < ?
        ${extra}
      order by occurred_at desc, id desc
      limit 1
    `;
    const rows = await this.queryBySql(sql, values);
    return rows?.[0] ? this.parseRow(rows[0]) : null;
  }

  buildValidation({ record, prevRecord, rule }) {
    const mode = rule?.enforcement_mode === 'block' ? 'block' : 'warn';
    const speedMap = rule?.max_speed_by_mode_json || {};
    const speed = Number(speedMap[record.travel_mode || 'walk'] || speedMap.walk || 5);
    const deltaSec = prevRecord ? Math.max(0, Number(record.occurred_at) - Number(prevRecord.occurred_at)) : 0;
    const maxReachableKm = prevRecord ? (speed * deltaSec) / 3600 : Number.POSITIVE_INFINITY;
    const actualDistanceKm = clamp(record.distance_from_prev_km ?? 0, 0, 1000000);
    const distanceRisk = prevRecord
      ? clamp(actualDistanceKm / Math.max(maxReachableKm || 1, 1), 0, 2) / 2
      : 0;

    const intent = clamp(record.stay_leave_intent_score, -100, 100);
    const intentEffect = clamp(intent / 100, -1, 1) * (intent >= 0 ? 1 : -1) * 0.3;

    const stayCost = clamp(record.stay_cost_score, 0, 100);
    const leaveCost = clamp(record.leave_cost_score, 0, 100);
    const stayCostEffect = -0.2 * (stayCost / 100);
    const leaveCostEffect = 0.2 * (leaveCost / 100);

    const desired = Array.isArray(record.desired_geo_codes) ? record.desired_geo_codes : [];
    const desiredEffect = desired.length === 0 ? 0 : (desired.includes(record.geo_code) ? -0.2 : 0.1);
    const viaLen = Array.isArray(record.via_geo_codes) ? record.via_geo_codes.length : 0;
    const pathEffect = viaLen > 0 ? -0.05 : 0;

    const factors = record.move_decision_factors && typeof record.move_decision_factors === 'object'
      ? record.move_decision_factors
      : {};
    const urgencyToLeave = clamp(factors.urgency_to_leave, 0, 100);
    const dutyToStay = clamp(factors.duty_to_stay, 0, 100);
    const survivalPressure = clamp(factors.survival_pressure, 0, 100);
    const decisionEffect = -(urgencyToLeave + survivalPressure) / 1000 + dutyToStay / 1000;

    const wDistance = Number(rule?.w_distance ?? 0.55);
    const wIntent = Number(rule?.w_intent ?? 0.2);
    const wStay = Number(rule?.w_stay_cost ?? 0.1);
    const wLeave = Number(rule?.w_leave_cost ?? 0.15);
    const wDesired = Number(rule?.w_desired ?? 0.1);
    const wPath = Number(rule?.w_path ?? 0.1);
    const wDecision = Number(rule?.w_decision ?? 0.15);
    let riskScore =
      distanceRisk * wDistance +
      intentEffect * wIntent +
      stayCostEffect * wStay +
      leaveCostEffect * wLeave +
      desiredEffect * wDesired +
      pathEffect * wPath +
      decisionEffect * wDecision;
    riskScore = clamp(riskScore, 0, 1.5);
    const okTh = Number(rule?.ok_threshold ?? 0.6);
    const blockTh = Number(rule?.block_threshold ?? 0.8);
    let level = 'ok';
    if (riskScore >= blockTh) level = mode === 'block' ? 'block' : 'warn';
    else if (riskScore >= okTh) level = 'warn';

    const result = {
      ok: level === 'ok' || level === 'warn',
      level,
      risk_score: Number(riskScore.toFixed(4)),
      max_reachable_km: Number((Number.isFinite(maxReachableKm) ? maxReachableKm : 0).toFixed(3)),
      actual_distance_km: Number(actualDistanceKm.toFixed(3)),
      enforcement_mode: mode,
      intent_effect: Number(intentEffect.toFixed(4)),
      stay_cost_effect: Number(stayCostEffect.toFixed(4)),
      leave_cost_effect: Number(leaveCostEffect.toFixed(4)),
      desired_effect: Number(desiredEffect.toFixed(4)),
      path_effect: Number(pathEffect.toFixed(4)),
      decision_effect: Number(decisionEffect.toFixed(4)),
      reason: level === 'block' ? 'POSITION_JUMP_BLOCKED' : (level === 'warn' ? 'POSITION_JUMP_WARN' : 'OK'),
    };
    return result;
  }
}

