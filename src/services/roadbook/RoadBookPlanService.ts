import service from '@/src/utils/mysql/service';
import { ISqlCondMap } from '@/src/utils/mysql/types';

class RoadBookPlanService extends service {

    constructor() {
        super('t_road_plan');
        this.setValidColumns([
            'ID',
            'name',
            'remark',
            'create_time',
            'update_time',
            'data',
            'map_type',
            'provinces'
        ]);
    }

}

export default RoadBookPlanService;
