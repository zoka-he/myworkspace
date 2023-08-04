import { ILoginUser } from "@/src/utils/auth/ILoginUser";
import service from "@/src/utils/mysql/service";
import { ISqlCondMap } from "@/src/utils/mysql/types";
import sm2prikey from '@/src/utils/cipher/sm2/loginPri.json';

const smCrypto = require('sm-crypto');

export default class LoginAccountService extends service {

    constructor() {
        super('t_login_account');

        this.setValidColumns([
            'ID',
            'username',
            'nickname',
            'password',
            'main_url',
            'roles',
            'create_time',
            'update_time',
            'type'
        ]);
    }

    async query(
        conditionOrSql: string | ISqlCondMap,
        values: Array<any>,
        order: Array<string>,
        page: number = 1,
        limit: number = 20,
        noCount: boolean = false
    ) {
        let result = await super.query(
            conditionOrSql,
            values,
            order,
            page,
            limit,
            noCount
        );

        let { data } = result;
        if (data instanceof Array) {
            data.forEach((item: any) => {
                if (item.password) {
                    item.password = '******'
                }
            })
        }

        return result;
    }

    async verifyUser(payload?: string): Promise<ILoginUser | null> {
        if (!payload) {
            return null;
        }

        try {
            let formJson = smCrypto.sm2.doDecrypt(payload, sm2prikey);
            let formData = JSON.parse(formJson);
            if (formData.username && formData.password) {
                let user: unknown = await this.queryOne({ 
                    username: formData.username, 
                    password: formData.password 
                });

                console.debug('user', user);

                if (user !== null) {
                    // @ts-ignore
                    console.debug(`用户 ${user.username} 登录成功`);
                    return (user as ILoginUser);
                } else {
                    console.debug(`用户不存在：${formData.username}`);
                }
            } 
            
        } catch(e: any) {
            console.error(e);
            console.debug(`登录出错：${e.message}`);
        }

        return null;
    }

}