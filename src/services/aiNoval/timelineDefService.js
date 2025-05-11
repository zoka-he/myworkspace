import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class FactionDefService extends MysqlNovalService {

    constructor() {
        super('timeline', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'epoch',
            'start_seconds',
            'hour_length_in_seconds',
            'day_length_in_hours',
            'month_length_in_days',
            'year_length_in_months'
        ]);
    }

}