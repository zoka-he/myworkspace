interface IPermission {
    ID?: number;
    PID?: number;
    label?: string;
    uri?: string;
    url?: string;
    type?: string;
    dispOrder?: number;
    children?: IPermission[];
    is_secret?: string;
    is_testing?: 0 | 1;
}

export type {
    IPermission
}