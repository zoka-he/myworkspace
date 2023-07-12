enum EBikeInfoType {
    RIDER = 'rider',
    BIKE = 'bike'
}

interface IBikeInfo {
    ID?: number
    PID: number
    name: string,
    type: typeof EBikeInfoType
}

export default IBikeInfo;
