function fileSizeMB(n) {
    if (typeof n !== 'number') {
        return '0';
    }
    return (n / (1000 * 1000)).toFixed(2) + 'MB'
}

function fileSizeKB(n) {
    if (typeof n !== 'number') {
        return '0';
    }
    return (n / (1000)).toFixed(2) + 'KB';
}

export default {
    fileSizeKB,
    fileSizeMB
}