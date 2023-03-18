export default function parseDayDetail(dayDb: any) {
    if (dayDb === null || dayDb === undefined || typeof dayDb !== 'object') {
        return null;
    }

    let detailData = dayDb.data;
    let detailJson = '';
    if (detailData.type === 'Buffer') {
        let nums: Array<number> = detailData.data;
        let decoder = new TextDecoder('utf-8');
        detailJson = decoder.decode(new Uint8Array(nums));
    }

    let detail: any = {};
    if (detailJson) {
        detail = JSON.parse(detailJson);
    }

    return detail;
}