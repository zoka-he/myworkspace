interface ITaskData {
    ID?: number,
    task_name?: string,
    employee?: string,
    problems?: string,
    detail?: string,
    priority?: number,
    fuck_date?: Date | string,
    deadline_time?: Date | string,
    msg_cnt?: number,
    bug_cnt?: number,
    sys_name?: string
    status: number
}

export type {
    ITaskData
}