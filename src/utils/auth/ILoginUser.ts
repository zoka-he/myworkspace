import { IPermission } from "@/pages/api/user/permission/type"

interface ILoginUser {
    ID: number
    username: string
    nickname: string
    perms: IPermission[]
}

export type {
    ILoginUser
}