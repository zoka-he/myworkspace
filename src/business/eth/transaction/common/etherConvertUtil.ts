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

export function float_multiply_2_bigint(valueStr: number | string, multiplier_log: number) : bigint {
    
    let parts = [];
    if (typeof valueStr === 'number') {
        parts = valueStr.toString().split('.');
    } else {
        parts = valueStr.split('.');
    }

    if (parts.length > 2 || parts.length === 0) {
        throw new Error('Invalid value string');
    }

    let integer = parts[0];
    let fraction = parts[1] || '0';

    if (fraction.length > multiplier_log) {
        fraction = fraction.slice(0, multiplier_log);
    } else {
        fraction = fraction.padEnd(multiplier_log, '0');
    }

    return BigInt(`${integer}${fraction}`);
}

export function eth2wei(eth: string | number) : bigint {
    return float_multiply_2_bigint(eth, 18);
}

export function gwei2wei(gwei: string | number) : bigint {
    return float_multiply_2_bigint(gwei, 9);
}

export function wei2eth(wei: string | bigint, decimals = 6) : number {
    return bigint_divide_2_float(wei, 18, decimals);
}

export function wei2gwei(wei: string | bigint, decimals = 6) : number {
    return bigint_divide_2_float(wei, 9, decimals);
}

export function readableAmount(value: string, unit: 'wei' | 'eth' | 'gwei' = 'wei') {

    if (!value?.length) {
        return '--';
    }

    let safeValue = value;
    
    if (unit === 'gwei') {
        safeValue = gwei2wei(value).toString();
    } else if (unit === 'eth') {
        safeValue = eth2wei(value).toString();
    } else if (unit === 'wei') {
        safeValue = BigInt(value.split('.')[0] || '0').toString();
    }

    if (BigInt(safeValue) > BigInt(10 ** 15)) {
        return wei2eth(safeValue).toString() + ' ETH';
    } else if (BigInt(safeValue) > BigInt(10 ** 6)) {
        return wei2gwei(safeValue).toString() + ' Gwei';
    } else {
        return safeValue + ' wei';
    }
}