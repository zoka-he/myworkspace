import { ILoginUser } from "@/src/utils/auth/ILoginUser";
import service from "@/src/utils/mysql/service";
import { ISqlCondMap } from "@/src/utils/mysql/types";
import sm2prikey from '@/src/utils/cipher/sm2/loginPri.json';

const smCrypto = require('sm-crypto');

export default class LoginLogService extends service {

    constructor() {
        super('t_login_log');

        this.setValidColumns([
            'LID',
            'UID',
            'ip_addr',
            'login_time',
        ]);
    }

    public async addLog(UID: number, ip_addr: string = '') {
        await this.insertOne({ UID, ip_addr });
    }

}