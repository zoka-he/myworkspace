interface ISqlCondObj {
    $ne?: any;
    $gt?: any;
    $lt?: any;
    $gte?: any;
    $lte?: any;
    $btw?: [any, any];
    $in?: Array<any>;
    $like?: string;
    $json_array?: Array<any>
    $json_contains?: any
}

interface ISqlCondMap {
    [propName: string]: string | string[] | number | number[] | Date | ISqlCondObj | null;
}

interface ISqlCondMapParsed {
    sql: string,
    values: any[]
}

export type {
    ISqlCondObj,
    ISqlCondMap,
    ISqlCondMapParsed
}