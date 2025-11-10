import MysqlService from '../../utils/mysql/service';

export default class EthAccountService extends MysqlService {
    constructor() {
        super('eth_contract', 'id');
        this.setValidColumns([
            'id',
            'name',
            'address',
            'deployer_account_id',
            'network_id',
            'abi',
            'bytecode',
            'source_code',
            'constructor_params',
            'status',
            'remark',
            'create_time',
            'update_time',
        ])
    }
}