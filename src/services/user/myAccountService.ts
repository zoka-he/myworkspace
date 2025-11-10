import LoginAccountService from "./loginAccountService";
import PermissionService from "./permissionService";
import RolePermissionService from "./rolePermissionService";

import cached from "@/src/utils/cache";
import { ILoginUser } from "@/src/utils/auth/ILoginUser";
import { IPermission } from "@/pages/api/web/user/permission/type";
import Log4js from "log4js";

class MyAccountService {

    private loginAccountService;
    private permissionService;
    private rolePermissionService;
    private logger;

    constructor() {
        this.loginAccountService = new LoginAccountService();
        this.permissionService = new PermissionService();
        this.rolePermissionService = new RolePermissionService();
        this.logger = Log4js.getLogger();
    }

    

    public static getUserPermissionKey() {
        return `LOGINUSER_PERMISSION_${'admin'}`;
    }

    public async getRolePermission(userID: number | null, roleID: number[], useCached = false) {
        let ret: IPermission[] = [];
        let cacheKey = MyAccountService.getUserPermissionKey();
        let useDb = false;

        if (useCached) {
            let permList = cached.get(cacheKey);
            if (permList instanceof Array && permList.length > 0) {
                ret = permList;
                this.logger.info(`get permission from cached`);
            } else {
                useDb = true;
                useCached = false;
            }
        } else {
            useDb = true;
        }

        if (useDb) {
            let queryRes = await this.rolePermissionService.getPermittedPageByRole();
            ret = (queryRes as IPermission[] );
            this.logger.info(`get admin permission from mysql`);
        }

        if (!useCached) {
            cached.set(cacheKey, ret);
        }
        

        return ret;
    }

    public async getAdminPermission(userID: number, useCached = true): Promise<IPermission[]> {
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
            let params: any = { type: 'menu' };
            if (process.env.NODE_ENV === 'production') {
                params.is_testing = 0;
            }


            // 测试,默认注释掉,强行模拟生成效果
            // params.is_testing = 0;

            let queryRes = await this.permissionService.query(params, [], ['ID asc'], 1, 500);
            ret = (queryRes.data as IPermission[] );
            this.logger.info(`get userID ${userID} permission from mysql`);
        }

        if (!useCached) {
            cached.set(cacheKey, ret);
        }

        return ret;
    }

    public async getMainPageInitData(userID: number) {
        // let loginUser: ILoginUser = await this.loginAccountService.queryOne({ ID: userID });
        let loginUser: ILoginUser = await this.loginAccountService.queryOne({ username: 'admin' });
        let userPerms: IPermission[] = []
        // if (loginUser.type === 'admin') {   // 超级管理员
            userPerms = await this.getAdminPermission(loginUser.ID, false);
        // } else {
            // userPerms = await this.getRolePermission(loginUser.ID, loginUser.roles, false);
        // }

        return {
            loginUser,
            userPerms
        }
    }

}

export default MyAccountService;