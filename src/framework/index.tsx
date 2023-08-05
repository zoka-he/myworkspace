import { Breadcrumb, Layout, Menu, FloatButton, Button, Space } from 'antd';
import { connect } from 'react-redux';
import React, { useEffect, useRef, useState } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import _ from 'lodash';
import type { IRootState } from '../store';
import getPermissionTree from '../business/user/permission/getPermissionTree';
import { IPermission } from '../business/user/permission/IPermission';
import { ItemType } from 'antd/es/menu/hooks/useItems';
import { useSession, signOut } from 'next-auth/react';
import { LogoutOutlined } from "@ant-design/icons";
import fetch from '@/src/fetch';


const { Sider, Header, Content } = Layout;

const mapStateToProps = (state: IRootState) => {
    return {
        lv1Key: state.navigatorSlice.lv1Key,
        lv2Key: state.navigatorSlice.lv2Key,
    }
}


function MainFrame(props: any) {

    let location = useLocation();
    let navigate = useNavigate();
    let [navMenu, setNavMenu] = useState<IPermission[]>([]);
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

        setNavMenu(tree || []);
    }

    async function loadInitData() {
        let initData: any = await fetch.get('/api/my-account/initdata');

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
    if (location.pathname === '/') {
        return <Navigate to='/taskManage/dashboard' />;
    }

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
                    items={(navMenu as ItemType[])}
                    onClick={e => onMenuClick(e)}
                />
            </Sider>
            <Layout>
                <Content style={{ backgroundColor: 'white' }}>
                    <div className="m-mainframe_context f-fit-height f-flex-col f-bg-white f-vertical-scroll">
                        <div className="m-mainframe_context-mainheader">
                            <span>{renderBreadcrumb()}</span>
                            <Space size={16}>
                                {session.data?.user?.name}
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