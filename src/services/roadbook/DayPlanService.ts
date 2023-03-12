import service from '@/src/utils/mysql/service';

class DayPlanService extends service {

    constructor() {
        super('t_day_plan');
        this.setValidColumns([
            'ID',
            'name',
            'remark',
            'create_time',
            'update_time',
            'data',
            'road_id',
            'day_index'
        ]);
    }

}

export default DayPlanService;
