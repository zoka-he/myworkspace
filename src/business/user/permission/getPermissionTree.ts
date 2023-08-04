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

async function getPermissionTree(params: any = {}) {
    let fetchConfig: AxiosRequestConfig = {};
    if (params) {
        fetchConfig.params = params;
    }
    let { data } = await fetch.get('/api/user/permission/list', fetchConfig);

    let map = new Map<number, IPermission>();
    let tree: IPermission[] = [];

    for (let item of data) {
        map.set(item.ID, item);
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

getPermissionTree.getNavMenu = async function() {
    let ret = await getPermissionTree({ type: 'menu' });
    for (let item of ret.data) {
        item.key = item.url; // 覆写key值；
    }
    return ret;
}

export default getPermissionTree;