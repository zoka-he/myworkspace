import service from "@/src/utils/mysql/service";

export default class AccountService extends service {

    constructor() {
        super('t_accounts', ['sys_name', 'username']);

        this.setValidColumns([
            'sys_name',
            'username',
            'passwd',
            'remark',
        ]);
    }

}