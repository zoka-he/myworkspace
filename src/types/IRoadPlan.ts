interface IRoadPlan {
    ID?: number
    name?: string
    remark?: string,
    create_time?: Date
    update_time?: Date
    map_type?: string
    provinces?: string[]
}

export type {
    IRoadPlan
}