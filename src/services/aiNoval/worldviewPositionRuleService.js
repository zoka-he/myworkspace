import { MysqlNovalService } from '@/src/utils/mysql/service';

const DEFAULT_RULE = {
  enforcement_mode: 'warn',
  max_speed_by_mode_json: {
    walk: 5,
    ride: 20,
    vehicle: 60,
    portal: 9999,
  },
  allow_special_transfer: 0,
  special_transfer_requires_tag: null,
  w_distance: 0.55,
  w_intent: 0.2,
  w_stay_cost: 0.1,
  w_leave_cost: 0.15,
  w_desired: 0.1,
  w_path: 0.1,
  w_decision: 0.15,
  ok_threshold: 0.6,
  block_threshold: 0.8,
};

export default class WorldviewPositionRuleService extends MysqlNovalService {
  constructor() {
    super('worldview_position_rule', ['worldview_id']);
    this.setValidColumns([
      'worldview_id',
      'enforcement_mode',
      'max_speed_by_mode_json',
      'allow_special_transfer',
      'special_transfer_requires_tag',
      'w_distance',
      'w_intent',
      'w_stay_cost',
      'w_leave_cost',
      'w_desired',
      'w_path',
      'w_decision',
      'ok_threshold',
      'block_threshold',
      'created_at',
      'updated_at',
    ]);
  }

  async getRule(worldviewId) {
    const id = Number(worldviewId);
    if (!Number.isFinite(id)) {
      throw new Error('worldview_id is required');
    }
    const row = await this.queryOne({ worldview_id: id });
    if (!row) {
      return { worldview_id: id, ...DEFAULT_RULE };
    }
    const parsed = { ...row };
    if (typeof parsed.max_speed_by_mode_json === 'string') {
      try {
        parsed.max_speed_by_mode_json = JSON.parse(parsed.max_speed_by_mode_json);
      } catch {
        parsed.max_speed_by_mode_json = DEFAULT_RULE.max_speed_by_mode_json;
      }
    }
    return { ...DEFAULT_RULE, ...parsed, worldview_id: id };
  }

  async upsertRule(worldviewId, payload = {}) {
    const id = Number(worldviewId);
    if (!Number.isFinite(id)) {
      throw new Error('worldview_id is required');
    }
    const merged = { ...(await this.getRule(id)), ...payload, worldview_id: id };
    if (merged.max_speed_by_mode_json && typeof merged.max_speed_by_mode_json !== 'string') {
      merged.max_speed_by_mode_json = JSON.stringify(merged.max_speed_by_mode_json);
    }
    const existed = await this.queryOne({ worldview_id: id });
    if (existed) {
      await this.updateOne({ worldview_id: id }, merged);
    } else {
      await this.insertOne(merged);
    }
    return this.getRule(id);
  }
}

