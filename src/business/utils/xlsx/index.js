import nodeXlsx from 'node-xlsx';
import * as XLSX from 'xlsx';
// import { Buffer } from 'buffer';

function buildXlsx(fdata) {
    let xlsxObj = [
        {
            name: 'Sheet1',
            data: fdata
        }
    ];
    return nodeXlsx.build(xlsxObj);
}

async function parseXlsx(path, sheetIdx = 0) {
    let bin = await window.accessLocal.readFile(path);
    console.debug('binary file', bin);

    // nodeXlsx不支持浏览器
    // let sheets = nodeXlsx.parse(bin);

    // workbook存放excel的所有基本信息
    let workbook = XLSX.read(bin, { type: "array", cellDates: true });
    // 定义sheetList中存放excel表格的sheet表，就是最下方的tab
    let sheetList = workbook.SheetNames;
    // 读取文件内容，（第一个sheet里的内容）
    // 后面的header:1可以使得表格以二维数组的形式输出
    let sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetList[sheetIdx]],{ header:1 });
    console.log(sheet);

    return sheet;
}

export default function (...args) {
    if (args[0] instanceof Array) {
        return buildXlsx(args[0]);
    }

    if (typeof args[0] === 'string') {
        return parseXlsx(args[0]);
    }
}