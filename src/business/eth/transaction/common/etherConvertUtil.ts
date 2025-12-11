export function bigint_divide_2_float(value: bigint | string, divisor_log: number, decimals = -1) : number {
    if (typeof value === 'string') {
        value = BigInt(value);
    }

    if (divisor_log < 0) {
        throw new Error('Divisor log must be greater than 0');
    }

    const divisor = BigInt(10 ** divisor_log);
    const integer = value / divisor;
    const fraction = value % divisor;
    
    
    if (fraction === BigInt(0)) {
        return parseInt(integer.toString());
    }
    
    const fractionStr = fraction.toString().padStart(divisor_log, '0');
    // console.debug('fractionStr is', fractionStr);

    let trimmed = '';
    if (decimals < 0) {
        trimmed = fractionStr.replace(/0+$/, '');
    } else if (decimals > 0) {
        trimmed = fractionStr.slice(0, decimals).replace(/0+$/, '');
    }

    if (!trimmed) {
        return parseInt(`${integer.toString()}`);
    } else {
        return parseFloat(`${integer.toString()}.${trimmed.toString()}`);
    }
    
}

export function wei2eth(wei: string | bigint, decimals = 6) : number {
    return bigint_divide_2_float(wei, 18, decimals);
}

export function wei2gwei(wei: string | bigint, decimals = 6) : number {
    return bigint_divide_2_float(wei, 9, decimals);
}

export function readableAmount(value: string) {
    if (BigInt(value) > BigInt(10 ** 15)) {
        return wei2eth(value).toString() + ' ETH';
    } else if (BigInt(value) > BigInt(10 ** 6)) {
        return wei2gwei(value).toString() + ' Gwei';
    } else {
        return value + ' wei';
    }
}