import MysqlService from '../../utils/mysql/service';

class EthNetworkService extends MysqlService {
    constructor() {
        super('eth_networks');
        this.setValidColumns([
            'id',
            'name',
            'chain_id',
            'rpc_url',
            'explorer_url',
            'is_testnet',
            'create_time',
            'update_time',
        ])
    }
}

export default EthNetworkService;