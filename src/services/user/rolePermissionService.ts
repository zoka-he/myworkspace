import service from "@/src/utils/mysql/service";

export default class RolePermissionService extends service {

    constructor() {
        super('t_role_and_permission', [ 'RID', 'PID' ]);

        this.setValidColumns([
            'RID',
            'PID',
            'get',
            'post',
            'del',
        ]);
    }

    public async updateRelative(RID: number, PID: number, get: boolean, post: boolean, del: boolean) {
        await this.deleteOne({ RID, PID });

        let { execute } = this.getBaseApi();
        await execute(
            'insert into t_role_and_permission(RID,PID,`get`,post,del) values(?,?,?,?,?);',
            [ 
                RID, 
                PID, 
                get ? 1 : 0, 
                post ? 1 : 0, 
                del ? 1: 0 
            ]
        );
    }

    public async getPermittedPageByRole(roles?: number[]) {
        let sql = `select tr.get, tr.post, tr.del, tp.ID, tp.PID, tp.label, tp.url, tp.type, tp.dispOrder 
            from (
                select PID permID, \`get\`, post, del 
                from t_role_and_permission 
                WHERE \`get\`=1
            ) tr 
            LEFT JOIN t_permission tp 
            on tp.ID=tr.permID AND type='menu'`

        let ret = await this.queryBySql(sql, []);

        return ret;
    }

}