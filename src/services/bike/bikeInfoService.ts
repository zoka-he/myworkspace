import service from "@/src/utils/mysql/service";

export default class BikeInfoService extends service {

    constructor() {
        super('t_bike_info', ['ID']);

        this.setValidColumns([
            'ID',
            'PID',
            'name',
            'type',
        ]);
    }

}