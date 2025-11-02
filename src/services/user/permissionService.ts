import service from "@/src/utils/mysql/service";

export default class PermissionService extends service {

    constructor() {
        super('t_permission');

        this.setValidColumns([
            'ID',
            'PID',
            'label',
            'type',
            'uri',
            'url',
            'dispOrder',
            'is_secret'
        ]);
    }

}