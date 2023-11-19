import { IPermission } from "@/pages/api/web/user/permission/type"

interface ILoginUser {
    ID: number
    username: string
    nickname: string
    type: string
    roles: number[]
}

export type {
    ILoginUser
}