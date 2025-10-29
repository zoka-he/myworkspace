import MysqlService from '../../utils/mysql/service';

class EthNetworkService extends MysqlService {
    constructor() {
        super('eth_networks', 'id');
        this.setValidColumns([
            'id',
            'name',
            'chain_id',
            'rpc_url',
            'explorer_url',
            'is_testnet',
            'create_time',
            'update_time',
            'vendor',
            'is_enable',
            'unit',
            'decimals',
            'unit_full'
        ])
    }
}

export default EthNetworkService;