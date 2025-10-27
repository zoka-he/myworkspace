import MysqlService from '../../utils/mysql/service';

class EthAccountService extends MysqlService {
    constructor() {
        super('eth_accounts');
        this.setValidColumns([
            'id',
            'name',
            'address',
            'private_key',
            'balance',
            'network',
            'remark',
            'create_time',
            'update_time',
        ])
    }
}

export default EthAccountService;