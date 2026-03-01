import { Breadcrumb, Layout, Menu, FloatButton, Button, Space, Switch, MenuTheme, Drawer } from 'antd';
import { connect } from 'react-redux';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { IRootState } from '../store';
import store from '../store';
import { setNavMenu as setStoreNavMenu } from '../store/navigatorSlice';
import { setDatasetsApiKey, setBaseUrl, setDifyFrontHostOptions } from '../store/difySlice';
import getPermissionTree from '../business/user/permission/getPermissionTree';
import { IPermission } from '../business/user/permission/IPermission';
import { ItemType } from 'antd/es/menu/hooks/useItems';
import fetch from '@/src/fetch';
import { setLoginUser } from '../store/loginSlice';
import AppHeader from './appHeader';
import WorkspaceHeader from './workspaceHeader';
import mysqlConfig from "@/src/config/mysql";
import _ from 'lodash';
import { setShowAll } from '@/src/store/navigatorSlice';
import { useSelector, useDispatch } from 'react-redux';
import { useAppState } from '../utils/hooks/useAppState';
import AppState from './appState';
import AppMenu from './appMenu';

const { Sider, Header, Content } = Layout;

const mapStateToProps = (state: IRootState) => {
    return {
        navMenu: state.navigatorSlice.navMenu,
        loginUser: state.loginSlice.user,
        menuSearchKey: state.navigatorSlice.menuSearchKey,
        showAll: state.navigatorSlice.showAll
    }
}

interface IMainFrameProps {
    navMenu: any[],
    loginUser: any,
    menuSearchKey: string,
    showAll: boolean
}

/** 当 body 不滚动、由 main 滚动时，BackTop 监听的滚动容器元素 id（需在 layout 里给 main 设此 id） */
export const MAIN_SCROLL_CONTAINER_ID = 'm-app-main';

const HEADER_BLUR_STYLE: React.CSSProperties = {
    background: 'var(--m-main-header-glass)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
};

function MainFrame(props: IMainFrameProps) {
    const dispatch = useDispatch();
    const showAll = useSelector((state: IRootState) => state.navigatorSlice.showAll);
    const themeMode = useSelector((state: IRootState) => state.themeSlice.themeConfig.algorithm);
    const [headerMounted, setHeaderMounted] = useState(false);

    useEffect(() => setHeaderMounted(true), []);

    let location = useLocation();
    let navigate = useNavigate();
    let permMap = useRef<Map<number, IPermission>>(new Map());
    let urlMap = useRef<Map<string, IPermission>>(new Map());

    let [normalOpenKeys, setNormalOpenKeys] = useState<string[]>([]);
    let [openKeys, setOpenKeys] = useState<string[]>([]);
    let [menu, setMenu] = useState<any[]>(props.navMenu);

    let { drawerVisible, toggleDrawerVisible } = useAppState();

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
        console.debug('showAll -->', props.showAll);

        function filterMenu(menu: any[], key: string): any[] {
            let menu2:any[] = [];

            menu.forEach(item => {
                if (item.is_secret === 'Y' && !props.showAll) {
                    return;
                }

                console.debug('item -->', item);
                console.debug('showAll -->', props.showAll);

                if (item.children instanceof Array) {
                    let children2 = filterMenu(item.children, key);
                    if (children2.length) {
                        menu2.push({ ...item, children: children2 });
                    }
                } else if (typeof item.label === 'string') {
                    if (!key) {
                        menu2.push({ ...item });
                    } else if (item.label.indexOf(key) > -1) {
                        menu2.push({ ...item });
                    }
                }
            });

            // console.debug('menu2 -->', menu2);

            return menu2;
        }


        setMenu(filterMenu(props.navMenu, props.menuSearchKey));
    }, [props.navMenu, props.menuSearchKey, props.showAll]);

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

        let ipData = initData.serverIp;
        store.dispatch(setDifyFrontHostOptions(_.uniq([
            `${mysqlConfig.MYSQL_HOST}`,
            window.location.hostname,
            ipData
        ])));
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

    const headerNode = (
        <div
            id="m-mainframe-header"
            className="p-0 m-0 flex flex-row app-layout-header fixed top-0 left-0 right-0 z-10"
            style={HEADER_BLUR_STYLE}
        >
            <AppHeader className='px-12' urlMap={urlMap.current} permMap={permMap.current}/>
            <div className='flex-1'>
                <AppMenu />
            </div>
            <WorkspaceHeader urlMap={urlMap.current} permMap={permMap.current}/>
        </div>
    );

    return (
        <div className="min-h-screen m-mainframe-root">
            {/* 挂载后 Portal 到 body 以正确应用 backdrop；未挂载时保留在树内避免首屏无顶栏 */}
            {headerMounted ? createPortal(headerNode, document.body) : headerNode}

            <div className="m-mainframe_context-outlet min-h-screen z-0 pt-15 px-6 pb-6">
                {/* 主界面 */}
                <Outlet />
            </div>

            

            

            {/* BackTop 挂载到 body；监听 main 滚动（main 需设 id={MAIN_SCROLL_CONTAINER_ID} 且可滚动），若无则回退到 window */}
            {headerMounted && createPortal(
                <FloatButton.BackTop
                    target={() => document.getElementById(MAIN_SCROLL_CONTAINER_ID) || window}
                />,
                document.body
            )}

            <Drawer title="状态" open={drawerVisible} onClose={() => toggleDrawerVisible()} width={500}>
                <AppState />
            </Drawer>
        </div>
    );
};

export default connect(mapStateToProps)(MainFrame);