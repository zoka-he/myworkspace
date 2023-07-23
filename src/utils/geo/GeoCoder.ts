const dataSource = {  
    "columns": [ 'code', 'label' ],
    "data": [  
        ['11', '北京市'],  
        ['12', '天津市'],  
        ['13', '河北省'],  
        ['14', '山西省'],  
        ['15', '内蒙古自治区'],  
        ['21', '辽宁省'],  
        ['22', '吉林省'],  
        ['23', '黑龙江省'],  
        ['31', '上海市'],  
        ['32', '江苏省'],  
        ['33', '浙江省'],  
        ['34', '安徽省'],  
        ['35', '福建省'],  
        ['36', '江西省'],  
        ['37', '山东省'],  
        ['38', '台湾省'],  
        ['39', '河南省'],  
        ['40', '湖北省'],  
        ['41', '湖南省'],  
        ['42', '广东省'],  
        ['43', '广西壮族自治区'],  
        ['44', '海南省'],  
        ['45', '重庆市'],  
        ['46', '四川省'],  
        ['47', '贵州省'],  
        ['48', '云南省'],  
        ['49', '西藏自治区'],  
        ['50', '陕西省'],  
        ['51', '甘肃省'],  
        ['52', '青海省'],
        ['53', '宁夏回族自治区'],
        ['54', '新疆维吾尔自治区'],
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
