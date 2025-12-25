import { IWorldViewDataWithExtra, ITimelineDef } from "@/src/types/IAiNoval";

export function getIntervalSize (
    dateRange: { min: number; max: number },
    timlineDef: ITimelineDef | IWorldViewDataWithExtra
): number {
    const range = dateRange.max - dateRange.min;

    let year_length_in_months = 12;
    let month_length_in_days = 30;
    let day_length_in_hours = 24;
    let hour_length_in_seconds = 3600;

    if ('year_length_in_months' in timlineDef && typeof timlineDef.year_length_in_months === 'number') {
        year_length_in_months = timlineDef.year_length_in_months;
    } else if ('tl_year_length_in_months' in timlineDef && typeof timlineDef.tl_year_length_in_months === 'number') {
        year_length_in_months = timlineDef.tl_year_length_in_months;
    }

    if ('month_length_in_days' in timlineDef && typeof timlineDef.month_length_in_days === 'number') {
        month_length_in_days = timlineDef.month_length_in_days;
    } else if ('tl_month_length_in_days' in timlineDef && typeof timlineDef.tl_month_length_in_days === 'number') {
        month_length_in_days = timlineDef.tl_month_length_in_days;
    }

    if ('day_length_in_hours' in timlineDef && typeof timlineDef.day_length_in_hours === 'number') {
        day_length_in_hours = timlineDef.day_length_in_hours;
    } else if ('tl_day_length_in_hours' in timlineDef && typeof timlineDef.tl_day_length_in_hours === 'number') {
        day_length_in_hours = timlineDef.tl_day_length_in_hours;
    }

    if ('hour_length_in_seconds' in timlineDef && typeof timlineDef.hour_length_in_seconds === 'number') {
        hour_length_in_seconds = timlineDef.hour_length_in_seconds;
    } else if ('tl_hour_length_in_seconds' in timlineDef && typeof timlineDef.tl_hour_length_in_seconds === 'number') {
        hour_length_in_seconds = timlineDef.tl_hour_length_in_seconds;
    }

    const yearInSeconds = year_length_in_months * month_length_in_days * day_length_in_hours * hour_length_in_seconds;
    const monthInSeconds = month_length_in_days * day_length_in_hours * hour_length_in_seconds;
    const dayInSeconds = day_length_in_hours * hour_length_in_seconds;

    const intervalSizes: number[] = [
        yearInSeconds * 1000,
        yearInSeconds * 500,
        yearInSeconds * 200,
        yearInSeconds * 100,
        yearInSeconds * 50,
        yearInSeconds * 20,
        yearInSeconds * 10,
        yearInSeconds * 5,
        yearInSeconds * 2,
        yearInSeconds,
        yearInSeconds * 0.5,
        monthInSeconds * 2,
        monthInSeconds,
        monthInSeconds * 0.5,
        dayInSeconds * 7,
        dayInSeconds,
    ];

    // 找到最大的、小于等于 range 的间隔
    // 或者找到第一个大于 range/20 的间隔（确保刻度不会太密集）
    let tickInterval = intervalSizes.find(size => range / size >= 5 && range / size <= 20);
    
    // 如果没找到合适的，使用最接近的
    if (!tickInterval) {
        // console.debug('tickInterval not found --->> ', timlineDef);
        tickInterval = intervalSizes.find(size => size <= range) || intervalSizes[intervalSizes.length - 1];
    } else {
        // console.debug('tickInterval found --->> ', tickInterval, intervalSizes);
    }

    // console.debug('tickInterval --->> ', tickInterval, timlineDef);
    return tickInterval;
}

export function getTickValues(
    dateRange: { min: number; max: number },
    tickInterval: number
): number[] {
    const minValue = dateRange.min;
    const maxValue = dateRange.max;
    const tickValues: number[] = [];
    for (let value = Math.ceil(minValue / tickInterval) * tickInterval; value <= maxValue; value += tickInterval) {
        tickValues.push(value);
    }
    // console.debug('tickValues --->> ', tickValues);
    return tickValues;
}