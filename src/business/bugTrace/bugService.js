import MysqlService from "../utils/mysql/service";

export default class BugService extends MysqlService {
    constructor() {
        super('t_bugs');
    }

    queryWithTaskName(conditions, page = 1, limit = 20) {

        let sql, values = [], baseSql = `select * from t_bugs ti left join (select task_name, ID as tid from t_task tt) as tt on ti.task_id=tt.tid`;

        let conditionSqlAndValue = this.parseConditionObject(conditions);
        if (conditionSqlAndValue) {
            sql = `select * from (${baseSql}) a where ${conditionSqlAndValue.sql}`;
            values = conditionSqlAndValue.values;
        } else {
            sql = baseSql;
        }

        return this.query(sql, values, ['create_time desc'], page, limit);
    }
}