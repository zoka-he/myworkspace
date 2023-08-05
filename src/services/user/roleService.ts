import service from "@/src/utils/mysql/service";

export default class RoleService extends service {

    constructor() {
        super('t_role');

        this.setValidColumns([
            'ID',
            'rolename',
        ]);
    }

}