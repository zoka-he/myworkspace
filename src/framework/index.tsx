import { Breadcrumb, Layout, Menu, FloatButton, Button, Space } from 'antd';
import { connect } from 'react-redux';
import React, { useEffect, useRef, useState } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import _ from 'lodash';
import type { IRootState } from '../store';
import store from '../store';
import { setNavMenu as setStoreNavMenu } from '../store/navigatorSlice';
import getPermissionTree from '../business/user/permission/getPermissionTree';
import { IPermission } from '../business/user/permission/IPermission';
import { ItemType } from 'antd/es/menu/hooks/useItems';
import { useSession, signOut } from 'next-auth/react';
import { LogoutOutlined, UserOutlined, SettingOutlined, FullscreenOutlined, FullscreenExitOutlined } from "@ant-design/icons";
import fetch from '@/src/fetch';
import { setLoginUser } from '../store/loginSlice';


const { Sider, Header, Content } = Layout;

const mapStateToProps = (state: IRootState) => {
    return {
        navMenu: state.navigatorSlice.navMenu,
        loginUser: state.loginSlice.user
    }
}

interface IMainFrameProps {
    navMenu: any[],
    loginUser: any
}

function MainFrame(props: IMainFrameProps) {

    let location = useLocation();
    let navigate = useNavigate();
    // let [navMenu, setNavMenu] = useState<IPermission[]>([]);
    let permMap = useRef<Map<number, IPermission>>(new Map());
    let urlMap = useRef<Map<string, IPermission>>(new Map());
    let session = useSession();

    useEffect(() => {
        loadInitData();
    }, []);

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
    }


    function onMenuClick(e: any) {
        let url = e.keyPath[0];
        navigate(url);
    }

    /**
     * 渲染面包屑
     * @returns 
     */
    function renderBreadcrumb() {
        if (!urlMap.current || !permMap.current) {
            return null;
        }

        let pathname = location.pathname;
        let menuItem = urlMap.current.get(pathname);
        console.debug('menuItem', menuItem);

        let breadcrumbItems = [];
        while (menuItem) {
            breadcrumbItems.unshift(<Breadcrumb.Item key={menuItem.ID}>{menuItem.label}</Breadcrumb.Item>);

            if (typeof menuItem.PID === 'number') {
                menuItem = permMap.current.get(menuItem.PID);
            } else {
                menuItem = undefined;
            }
        }

        return <Breadcrumb>{breadcrumbItems}</Breadcrumb>;
    }

    // 主页默认
    if (props?.loginUser && location.pathname === '/') {
        let to = props.loginUser.main_url || '/taskManage/dashboard';
        return <Navigate to={to} />;
    }

    let userLabel = null;
    if (props?.loginUser?.nickname || session.data?.user?.name) {
        const openProfile = () => navigate('/user/profile?tabKey=1');
        userLabel = <Button type="text" icon={<UserOutlined/>} onClick={openProfile}>{props?.loginUser?.nickname || session.data.user.name}</Button>
    }

    let settingLabel = (
        <Button type="text" icon={<SettingOutlined />} onClick={() => navigate('/user/profile?tabKey=2')}>设置</Button>
    )


    return (
        <Layout className="f-fit-height">
            <Sider width={160}>
                <div className='f-fit-width f-align-center' style={{ backgroundColor: 'rgb(40 83 155)' }}>
                    <h2 style={{ color: 'white', lineHeight: '46px' }}>工作台</h2>
                </div>
                <Menu
                    className="f-flex-1"
                    theme="dark"
                    mode="inline"
                    inlineIndent={16}
                    items={(props.navMenu as ItemType[])}
                    onClick={e => onMenuClick(e)}
                />
            </Sider>
            <Layout>
                <Content style={{ backgroundColor: 'white' }}>
                    <div className="m-mainframe_context f-fit-height f-flex-col f-bg-white f-vertical-scroll">
                        <div className="m-mainframe_context-mainheader">
                            <span>{renderBreadcrumb()}</span>
                            <Space size={16}>
                                {userLabel}
                                {settingLabel}
                                {/* <Button type="text" icon={<FullscreenOutlined />}>全屏</Button> */}
                                <Button danger type="primary" icon={<LogoutOutlined />} style={{ width: 40 }} onClick={() => signOut()}></Button>
                            </Space>
                        </div>
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