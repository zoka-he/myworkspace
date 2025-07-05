import { Breadcrumb, Layout, Menu, FloatButton, Button, Space } from 'antd';
import { connect } from 'react-redux';
import React, { useEffect, useRef, useState } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { IRootState } from '../store';
import store from '../store';
import { setNavMenu as setStoreNavMenu } from '../store/navigatorSlice';
import { setDatasetsApiKey, setBaseUrl } from '../store/difySlice';
import getPermissionTree from '../business/user/permission/getPermissionTree';
import { IPermission } from '../business/user/permission/IPermission';
import { ItemType } from 'antd/es/menu/hooks/useItems';
import fetch from '@/src/fetch';
import { setLoginUser } from '../store/loginSlice';
import AppHeader from './appHeader';
import WorkspaceHeader from './workspaceHeader';


const { Sider, Header, Content } = Layout;

const mapStateToProps = (state: IRootState) => {
    return {
        navMenu: state.navigatorSlice.navMenu,
        loginUser: state.loginSlice.user,
        menuSearchKey: state.navigatorSlice.menuSearchKey,
    }
}

interface IMainFrameProps {
    navMenu: any[],
    loginUser: any,
    menuSearchKey: string
}

function MainFrame(props: IMainFrameProps) {

    let location = useLocation();
    let navigate = useNavigate();
    let permMap = useRef<Map<number, IPermission>>(new Map());
    let urlMap = useRef<Map<string, IPermission>>(new Map());

    let [normalOpenKeys, setNormalOpenKeys] = useState<string[]>([]);
    let [openKeys, setOpenKeys] = useState<string[]>([]);
    let [menu, setMenu] = useState<any[]>(props.navMenu);

    useEffect(() => {
        loadInitData();
    }, []);

    useEffect(() => {
        if (!props.menuSearchKey) {
            setOpenKeys(normalOpenKeys);
        } else {
            let iter = permMap.current.values();
            let keys: string[] = [];
            let rs = iter.next();
            while(!rs.done) {
                let item = rs.value;
                if (item.PID !== -1 && item?.uri) {
                    keys.push(item?.uri);
                }
                rs = iter.next();
            }
            setOpenKeys(keys);
        }
    }, [normalOpenKeys, props.menuSearchKey]);

    useEffect(() => {
        function filterMenu(menu: any[], key: string): any[] {
            let menu2:any[] = [];

            menu.forEach(item => {
                if (item.children instanceof Array) {
                    let children2 = filterMenu(item.children, key);
                    if (children2.length) {
                        menu2.push({ ...item, children: children2 });
                    }
                } else if (typeof item.label === 'string') {
                    if (item.label.indexOf(key) > -1) {
                        menu2.push({ ...item });
                    }
                }
            });

            // console.debug('menu2 -->', menu2);

            return menu2;
        }

        if (!props.menuSearchKey) {
            setMenu(props.navMenu);
        } else {
            setMenu(filterMenu(props.navMenu, props.menuSearchKey));
        }
    }, [props.navMenu, props.menuSearchKey]);

    async function loadNavMenu(userPerms: IPermission[]) {
        let { tree, map, data } = await getPermissionTree.getNavMenu(userPerms);

        if (data instanceof Array) {
            let map = new Map<string, IPermission>();

            data.forEach(item => {
                item.url && map.set(item.url, item);
            })

            urlMap.current = map;
        }

        if (map instanceof Map) {
            permMap.current = map;
        }

        // setNavMenu(tree || []);
        store.dispatch(setStoreNavMenu(tree || []));
    }

    async function loadInitData() {
        let initData: any = await fetch.get('/api/my-account/initdata');

        if (initData.loginUser) {
            store.dispatch(setLoginUser(initData.loginUser));
        }

        if (initData.userPerms) {
            loadNavMenu(initData.userPerms);
        }

        let novelToolParams = await fetch.get('/api/aiNoval/toolConfig/params');

        if (novelToolParams?.data?.length > 0) {
            novelToolParams.data.forEach((item: any) => {
                if (item.cfg_name === 'DIFY_DATASET_API_KEY') {
                    store.dispatch(setDatasetsApiKey(item.cfg_value_string));
                } else if (item.cfg_name === 'DIFY_DATASET_BASE_URL') {
                    store.dispatch(setBaseUrl(item.cfg_value_string));
                }
            });
        }
    }


    function onMenuClick(e: any) {
        let url = e.keyPath[0];
        navigate(url);
    }

    function onOpenChange(keys: string[]) {
        const latestOpenKey = keys.find(key => (normalOpenKeys || []).indexOf(key) === -1);
        if (latestOpenKey) {
            setNormalOpenKeys([latestOpenKey]);
        } else {
            setNormalOpenKeys([]);
        }
    };


    // 主页默认
    if (props?.loginUser && location.pathname === '/') {
        let to = props.loginUser.main_url || '/taskManage/dashboard';
        return <Navigate to={to} />;
    }

    // console.debug('menu -->', menu);

    return (
        <Layout className="f-fit-height">
            <Sider width={160}>
                <AppHeader/>
                <Menu
                    className="f-flex-1"
                    theme="dark"
                    mode="inline"
                    inlineIndent={16}
                    items={(menu as ItemType[])}
                    onClick={e => onMenuClick(e)}
                    openKeys={openKeys}
                    onOpenChange={onOpenChange}
                />
            </Sider>
            <Layout>
                <Content style={{ backgroundColor: 'white' }}>
                    <div className="m-mainframe_context f-fit-height f-flex-col f-bg-white f-vertical-scroll">
                        <WorkspaceHeader urlMap={urlMap.current} permMap={permMap.current}/>
                        <div className="m-mainframe_context-outlet f-flex-1" style={{ margin: '12px 0 0' }}>
                            {/* 主界面 */}
                            <Outlet />
                        </div>
                    </div>
                </Content>
            </Layout>
            <FloatButton.BackTop />
        </Layout>
    );
};

export default connect(mapStateToProps)(MainFrame);