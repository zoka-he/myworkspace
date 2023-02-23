import service from '@/src/utils/mysql/service';

class RoadBookPlanService extends service {

    constructor() {
        super('t_road_plan');
        this.setValidColumns([
            'ID',
            'name',
            'remark',
            'create_time',
            'update_time'
        ]);
    }

}

export default RoadBookPlanService;
