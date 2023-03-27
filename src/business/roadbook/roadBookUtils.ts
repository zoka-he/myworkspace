import * as Dayjs from 'dayjs';

function secondToHHmm(n: number) {
    // @ts-ignore
    let t0 = Dayjs().startOf('day');
    t0 = t0.add(Dayjs.duration({ seconds: n }));
    return t0.format('HH:mm');
}

function timestampToHHmm(ts: number) {
    // @ts-ignore
    return Dayjs(ts).format('HH:mm');
}

function preferTime2Str(preferTime: any) {
    let ss = null;
    if (preferTime instanceof Array) {
        // ss = preferTime.map(n => secondToHHmm(n)).join(' - ');
        ss = secondToHHmm(preferTime[0]);
    }
    return ss;
}

export default {
    preferTime2Str,
    secondToHHmm,
    timestampToHHmm
}