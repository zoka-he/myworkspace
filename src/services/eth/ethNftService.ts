import MysqlService from '../../utils/mysql/service';

class EthNftService extends MysqlService {
    constructor() {
        super('eth_nft', 'id');
        this.setValidColumns([
            'id',
            'contract_id',
            'contract_address',
            'token_id',
            'owner_address',
            'minter_address',
            'minter_account_id',
            'metadata_uri',
            'name',
            'description',
            'image_url',
            'attributes',
            'transaction_hash',
            'network_id',
            'network',
            'chain_id',
            'status',
            'remark',
            'create_time',
            'update_time',
        ])
    }
}

export default EthNftService;