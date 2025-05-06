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

    async saveConfig(cfgName, cfgValue) {
        const sql = `
            INSERT INTO dify_tools_config (cfg_name, cfg_value_string)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE cfg_value_string = VALUES(cfg_value_string)
        `;
        const values = [cfgName, cfgValue];

        try {
            const result = await this.execute(sql, values);
            return result[0].affectedRows > 0;
        } catch (error) {
            console.error('Failed to save tool config:', error);
            return false;
        }
    }

}