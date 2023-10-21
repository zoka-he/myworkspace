import { Breadcrumb, Layout, Menu, FloatButton, Button, Space } from 'antd';
import { connect } from 'react-redux';
import React, { useEffect, useRef, useState } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import AppHeader from './appHeader';
import WorkspaceHeader from './workspaceHeader';


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

    // 主页默认
    if (props?.loginUser && location.pathname === '/') {
        let to = props.loginUser.main_url || '/taskManage/dashboard';
        return <Navigate to={to} />;
    }

    return (
        <Layout className="f-fit-height">
            <Sider width={160}>
                <AppHeader/>
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