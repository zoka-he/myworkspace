import fetch from '@/src/fetch';
import type { IPermission } from './IPermission';
import { AxiosRequestConfig } from 'axios';

function orderNodeList(nodes: IPermission[]) {
    nodes.sort((a, b) => {
        if (typeof a.dispOrder !== 'number' || typeof b.dispOrder !== 'number') {
            return 0;
        } else {
            return a.dispOrder - b.dispOrder;
        }
    })
}

async function getRemotePermissionList(params: any = {}) {
    let fetchConfig: AxiosRequestConfig = {};
    if (params) {
        fetchConfig.params = params;
    }
    let { data } = await fetch.get('/api/user/permission/list', fetchConfig);
    return data;
}


function fromData(data: IPermission[]) {
    let map = new Map<number, IPermission>();
    let tree: IPermission[] = [];

    for (let item of data) {
        item.ID && map.set(item.ID, item);
    }

    map.forEach((v, k, map) => {
        let { PID } = v;
        if (typeof PID !== 'number' || !map.has(PID)) {
            tree.push(v);
            return;
        }

        let parent = map.get(PID);
        // if (!parent) {
        if (PID === 0) {
            tree.push(v);
            return;
        }

        if (parent) {
            if (!(parent.children instanceof Array)) {
                parent.children = [];
            }
            parent.children.push(v);
        }
    });

    map.forEach((v) => {
        if (v.children?.length) {
            orderNodeList(v.children);
        }
    });

    orderNodeList(tree);

    return {
        tree,
        map,
        data
    };
}

async function fromRemote(params: any = {}) {

    // 在生产环境，强制不显示测试模式的目录
    if (typeof params?.is_testing === 'undefined') {
        if (process.env.NODE_ENV === 'production') {
            params.is_testing = 0;
        }
    }

    // 测试,默认注释掉,强行模拟生成效果
    // params.is_testing = 0;

    let data = await getRemotePermissionList(params);
    return fromData(data);
}


async function getNavMenu(data?: IPermission[]) {
    let ret;

    if (!data?.length) {
        ret = await fromRemote({ type: 'menu' });
    } else {
        ret = fromData(data);
    }

    for (let item of ret.data) {
        // @ts-ignore
        item.key = item.url; // 覆写key值；
    }
    return ret;
}

const getPermissionTree = { fromRemote, fromData, getNavMenu };

export default getPermissionTree;