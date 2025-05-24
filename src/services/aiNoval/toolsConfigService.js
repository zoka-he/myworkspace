import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class NovalManageService extends MysqlNovalService {

    constructor() {
        super('dify_tools_config', ['cfg_name']);

        this.setValidColumns([
            'cfg_name',
            'cfg_value_string',
            'cfg_value_int'
        ]);
    }

    async getConfig(cfgName) {
        let result = await this.query({ cfg_name: cfgName }, [], ['cfg_name asc'], 1, 1);
        console.debug('result', result);
        return result.data[0]?.cfg_value_string || '';
    }

    async getConfigs(cfgNames) {
        let result = await this.query({ cfg_name: { $in: cfgNames } }, [], ['cfg_name asc'], 1, 1);
        console.debug('result', result);
        return result;
    }

    async saveConfig(cfgName, cfgValue) {
        const sql = `
            INSERT INTO dify_tools_config (cfg_name, cfg_value_string)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE cfg_value_string = VALUES(cfg_value_string)
        `;
        const values = [cfgName, cfgValue];

        try {
            const result = await this.getBaseApi().execute(sql, values);
            return result[0].affectedRows > 0;
        } catch (error) {
            console.error('Failed to save tool config:', error);
            return false;
        }
    }

}