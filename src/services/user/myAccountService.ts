import LoginAccountService from "./loginAccountService";
import PermissionService from "./permissionService";

import cached from "@/src/utils/cache";
import { ILoginUser } from "@/src/utils/auth/ILoginUser";
import { IPermission } from "@/pages/api/user/permission/type";
import Log4js from "log4js";

class MyAccountService {

    private loginAccountService;
    private permissionService;
    private logger;

    constructor() {
        this.loginAccountService = new LoginAccountService();
        this.permissionService = new PermissionService();
        this.logger = Log4js.getLogger();
    }

    public async getRolePermission(roleID: number[]) {

    }

    public static getUserPermissionKey(userID: number) {
        return `LOGINUSER_PERMISSION_${userID}`;
    }

    public async getUserPermission(userID: number, useCached = true): Promise<IPermission[]> {
        let ret: IPermission[] = [];
        let cacheKey = MyAccountService.getUserPermissionKey(userID);
        let useDb = false;

        if (useCached) {
            let permList = cached.get(cacheKey);
            if (permList instanceof Array && permList.length > 0) {
                ret = permList;
                this.logger.info(`get userID ${userID} permission from cached`);
            } else {
                useDb = true;
                useCached = false;
            }
        } else {
            useDb = true;
        }

        if (useDb) {
            let queryRes = await this.permissionService.query({ type: 'menu' }, [], ['ID asc'], 1, 500);
            ret = (queryRes.data as IPermission[] );
            this.logger.info(`get userID ${userID} permission from mysql`);
        }

        if (!useCached) {
            cached.set(cacheKey, ret);
        }
        

        return ret;
    }

    public async getMainPageInitData(userID: number) {
        let loginUser: ILoginUser = await this.loginAccountService.queryOne({ ID: userID });
        let userPerms: IPermission[] = await this.getUserPermission(loginUser.ID, false);

        return {
            loginUser,
            userPerms
        }
    }

}

export default MyAccountService;