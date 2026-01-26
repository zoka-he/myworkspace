import _ from 'lodash';

export function distanceToSimilarity(distance: number): number {
    // 对于余弦距离（0~2 范围），使用 1 - distance/2
    // 对于 L2 距离，使用 1 / (1 + distance)
    // 这里假设是余弦距离，如果实际是 L2 距离，可以改为 1 / (1 + distance)
    const similarity = Math.max(0, Math.min(1, 1 - distance / 2));
    return similarity;
}

export function normalizeScore<T extends Record<string, any>>(item: T[], src_column: string, dst_column: string, max: number = 1, min: number = 0): (T & { [dst_column]: number })[] {

    let scores = item.map((item) => item[src_column]).filter(_.isNumber);

    let min_score = Math.min(1, ...scores);
    let max_score = Math.max(0,...scores);
    if (min_score > max_score) {
        let temp = min_score;
        min_score = max_score;
        max_score = temp;
    }

    return item.map(item => ({
        ...item,
        [dst_column]: (item[src_column] - min_score) / (max_score - min_score),
    }));
}

export function sigmoid(x: number, k: number, x0: number): number {
    return 1 / (1 + Math.exp(-k * (x - x0)));
}