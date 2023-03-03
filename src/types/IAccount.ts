interface IAccount {
    ID?: number
    sys_name: string
    username: string
    passwd?: string
    remark?: string
    update_time?: Date
}

export type {
    IAccount
}