import { message } from 'antd';
import testUtils from './test';

async function fetch(...args) {
    console.debug('fetch 进入 getTestCase 前');
    let testCase = testUtils.getTestCase(...args);
    if (testCase) {
        console.debug('进入测试用例：', testCase.name);
        let resp = testCase.response();
        console.debug('结果：', resp);
        return resp;
    }


    if (!window?.nativeAxios?.request) {
        message.error('此功能需要在Electron框架中运行！');
        throw new Error('Electron framework is required!');
    }

    console.debug('请求参数', ...args);
    let resp = await window.nativeAxios.request(...args);
    console.debug('请求应答', resp);

    return resp;
}

fetch.parseJsonResult = function (resp) {
    let json = JSON.parse(resp);
    if (json.status != 200) {
        let msg = resp.message || '未知错误';
        message.error(msg);
        throw new Error(msg);
    }

    return json;
}


export default fetch;