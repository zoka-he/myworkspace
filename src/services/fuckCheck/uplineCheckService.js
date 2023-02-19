import Service from '../../utils/mysql/service';

export default class UplineCheckService extends Service {

    constructor() {
        super('t_upline_check');
        this.setValidColumns([
            'ID',
            'fuck_date',
            'sys_name',
            'req_net',
            'req_sa',
            'req_root',
            'req_f5',
            'crash_info',
        ])
    }

    async queryAllUplineTask() {
        let sql = `select 
                fuck_date, sys_name, group_concat(tinfo separator '|') as tlist 
            from (
                select 
                    fuck_date, sys_name, concat(ID, ':', task_name) tinfo 
                from t_task tta 
                where 
                      tta.fuck_date is not null and tta.status < 4
            ) ttg
            group by ttg.sys_name, ttg.fuck_date
            order by fuck_date asc, sys_name asc;`

        return await this.queryBySql(sql);
    }

    async queryUplineTaskAndCheck() {
        let sql = `select *
                    from (
                        select fuck_date tu_fuck_date, sys_name tu_sys_name, group_concat(tinfo separator '|') as tlist
                        from (
                                 select fuck_date, sys_name, concat(ID, ':', task_name) tinfo
                                 from t_task tta
                                 where tta.fuck_date is not null and tta.status < 5
                             ) ttg
                        group by ttg.sys_name, ttg.fuck_date
                        order by fuck_date asc, sys_name asc
                    ) tul
                    left join (
                       select * from t_upline_check tuc
                    ) tuc
                  on tuc.fuck_date = tul.tu_fuck_date and tuc.sys_name = tul.tu_sys_name;`

        let data = await this.queryBySql(sql);
        console.debug(data);

        return data;
    }

}