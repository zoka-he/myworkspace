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

}