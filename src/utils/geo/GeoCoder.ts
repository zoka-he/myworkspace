const dataSource = {  
    "columns": [ 'code', 'label' ],
    "data": [  
        ['11', '北京'],  
        ['12', '天津'],  
        ['13', '河北'],  
        ['14', '山西'],  
        ['15', '内蒙古'],  
        ['21', '辽宁'],  
        ['22', '吉林'],  
        ['23', '黑龙江'],  
        ['31', '上海'],  
        ['32', '江苏'],  
        ['33', '浙江'],  
        ['34', '安徽'],  
        ['35', '福建'],  
        ['36', '江西'],  
        ['37', '山东'],  
        ['38', '台湾'],  
        ['39', '河南'],  
        ['40', '湖北'],  
        ['41', '湖南'],  
        ['42', '广东'],  
        ['43', '广西'],  
        ['44', '海南'],  
        ['45', '重庆'],  
        ['46', '四川'],  
        ['47', '贵州'],  
        ['48', '云南'],  
        ['49', '西藏'],  
        ['50', '陕西'],  
        ['51', '甘肃'],  
        ['52', '青海'],
        ['53', '宁夏'],
        ['54', '新疆'],
    ]
};

function findRow(value: string | number, label?: string) {
    let labelPos = -1;
    if (label) {
        labelPos = dataSource.columns.indexOf(label);
    }

    if (labelPos > -1) {
        for (let row of dataSource.data) {
            if (row[labelPos] == value) {
                return row;
            }
        }
    } else {
        for (let row of dataSource.data) {
            for (let cell of row) {
                if (cell == value) {
                    return row;
                }
            }
        }
    }

    throw new Error('找不到内容为 ' + value + ' 的对象')
}

function getCellOfRow(row: any[], label: string) {
    let labelPos = -1;
    if (label) {
        labelPos = dataSource.columns.indexOf(label);
    }

    if (labelPos === -1) {
        throw new Error('找不到 ' + label + ' 列');
    }

    return row[labelPos];
}

function findProvinceOfCode(code: string | number) {
    let row = findRow(code, 'code');
    return getCellOfRow(row, 'label');
}

function findCodeOfProvince(name: string) {
    let row = findRow(name, 'label');
    return getCellOfRow(row, 'code');
}

function getCodes() {
    let list: any[] = [];

    dataSource.data.forEach(itemData => {
        let item: any = {};
        dataSource.columns.forEach((col, index) => {
            item[col] = itemData[index];
        });
        list.push(item);
    });

    return list;
}


export default {
    findProvinceOfCode,
    findCodeOfProvince,
    getCodes
}
