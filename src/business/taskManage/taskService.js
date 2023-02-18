import MysqlService from "../utils/mysql/service";

class TaskService extends MysqlService {

    constructor() {
        super('t_task');
        this.setValidColumns([
            'ID',
            'task_name',
            'priority',
            'detail',
            'status',
            'fuck_date',
            'create_time',
            'update_time',
            'disp_order',
            'employee',
            'problems',
            'deadline_time',
            'sys_name',
            'is_week_report'
        ]);
    }

    async getDashboard(extraCond = {}) {
        let parseRes = this.parseConditionObject({
            ...extraCond,
            status: { $ne: 5 }
        });

        let condSql = parseRes.sql, values = parseRes.values;

        let sql = `select * 
            from (
                SELECT * FROM t_task tt WHERE ${condSql}
            ) tt 
            left join (
                SELECT task_id msg_tid, count(*) msg_cnt FROM t_interact group by msg_tid
            ) ti
            on tt.ID=ti.msg_tid
            left join (
                SELECT task_id bug_tid, count(*) bug_cnt FROM t_bugs where status < 4 group by bug_tid
            ) tb
            on tt.ID=tb.bug_tid
            order by priority desc, disp_order asc`;
        return await this.queryBySql(sql, values);
    }

    async getTaskCount() {
        let sql = `select 
            count(0) total, 
            count(if(status<4, 1, null)) unfinished, 
            count(if(status=0, 1, null)) not_started, 
            count(if(status=1, 1, null)) developing, 
            count(if(status=2, 1, null)) testing, 
            count(if(status=3, 1, null)) fuckable, 
            count(if(status=4, 1, null)) finished, 
            count(if(status=5, 1, null)) closed, 
            employee 
        from t_task group by employee;`;
        let data = await this.queryBySql(sql, []);
        console.debug('data', data);
        return data;
    }

}

export default TaskService;