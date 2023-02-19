import MysqlService from '../../utils/mysql/service';

class EmployeeService extends MysqlService {
    constructor() {
        super('t_employee');
    }
}

export default EmployeeService;