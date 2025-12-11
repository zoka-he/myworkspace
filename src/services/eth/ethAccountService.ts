import MysqlService from '../../utils/mysql/service';

class EthAccountService extends MysqlService {
    constructor() {
        super('eth_accounts', 'id');
        this.setValidColumns([
            'id',
            'name',
            'address',
            'private_key',
            'network_id',
            'remark',
            'create_time',
            'update_time',
            'mnemonic_phrase'
        ])
    }

    async getAccountsAndBalances(name: string, address: string, chain_id: number, page: number, limit: number) {
        let sql = `
            select ea.*, en.name as network, en.chain_id, eab.balance, en.unit, eab.update_time as balance_update_time
            from eth_accounts ea
            left join eth_networks en on network_id = en.id 
            left JOIN eth_accounts_balance eab on eab.address = ea.address and eab.chain_id = en.chain_id
        `;

        let where = '';
        let values: any[] = [];

        if (name) {
            where += ` and ea.name like ?`;
            values.push(`%${name}%`);
        }
        if (address) {
            where += ` and ea.address like ?`;
            values.push(`%${address}%`);
        }
        if (chain_id) {
            where += ` and en.chain_id = ?`;
            values.push(chain_id);
        }

        if (where) {
            sql += ` where ${where.replace(/^\s?and\s?/i, '')}`;
        }

        return await this.query(sql, values, ['ea.create_time asc'], page, limit);
    }
}

export default EthAccountService;