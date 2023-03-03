import service from "@/src/utils/mysql/service";

export default class AccountService extends service {

    constructor() {
        super('t_accounts_histroy');

        this.setValidColumns([
            'sys_name',
            'username',
            'passwd',
            'remark',
            'ID',
            'update_time'
        ]);
    }

}