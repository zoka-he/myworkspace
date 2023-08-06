interface IPermission {
    ID?: number;
    PID?: number;
    label?: string;
    uri?: string;
    url?: string;
    type?: string;
    dispOrder?: number;
    children?: IPermission[];
}

export type {
    IPermission
}