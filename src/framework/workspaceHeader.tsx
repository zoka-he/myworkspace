import { Breadcrumb, Button, Select, Space, Switch, Tag } from "antd";
import { connect } from "react-redux";
import store, { IRootState } from "../store";
import { useSession, signOut } from 'next-auth/react';
import { useNavigate } from "react-router-dom";
import { UserOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { useRef, useState } from "react";
import { IPermission } from "@/pages/api/web/user/permission/type";
import { setLastPathname, setHistoryTags, setShowAll } from "@/src/store/navigatorSlice";
import _ from 'lodash';
import mysqlConfig from "@/src/config/mysql";
import { setFrontHost } from "@/src/store/difySlice";

const mapStateToProps = (state: IRootState) => {
    return {
        navMenu: state.navigatorSlice.navMenu,
        loginUser: state.loginSlice.user,
        lastPathname: state.navigatorSlice.lastPathname,
        hisTags: state.navigatorSlice.historyTags,
        showAll: state.navigatorSlice.showAll,
        difyFrontHost: state.difySlice.frontHost,
        difyFrontHostOptions: state.difySlice.difyFrontHostOptions
    }
}


interface IWorkspaceHeaderProps {
    loginUser: any
    lastPathname: string
    hisTags: any[]
    permMap?: Map<number, IPermission>
    urlMap?: Map<string, IPermission>
    showAll: boolean
    difyFrontHost: string | null
    difyFrontHostOptions: string[]
}

function WorkspaceHeader(props: IWorkspaceHeaderProps) {
    let session = useSession();
    let navigate = useNavigate();

    let userLabel = null;
    if (props?.loginUser?.nickname || session?.data?.user?.name) {
        const openProfile = () => navigate('/user/profile?tabKey=1');
        userLabel = <Button type="text" icon={<UserOutlined/>} onClick={openProfile}>{props?.loginUser?.nickname || session?.data?.user?.name}</Button>
    }

    let settingLabel = (
        <Button type="text" icon={<SettingOutlined />} onClick={() => navigate('/user/profile?tabKey=2')}>设置</Button>
    )

    let pathname = location.pathname;
    let navItems = [];

    if (props.urlMap) {
        let menuItem = props.urlMap.get(pathname);

        while (menuItem) {
            navItems.unshift(menuItem);
            if (props.permMap && typeof menuItem.PID === 'number') {
                menuItem = props.permMap.get(menuItem.PID);
            } else {
                menuItem = undefined;
            }
        }
    }

    // 监测url地址，如果跟store里面不一致，则更新store，并添加tag
    if (pathname !== props.lastPathname) {
        store.dispatch(setLastPathname(location.pathname));
        if (-1 === _.findIndex(props.hisTags, { url: pathname })) {
            let tags2 = [
                { label: navItems.map(item => item.label).join('/') || pathname, url: pathname },
                ...props.hisTags
            ];

            if (tags2.length > 6) {
                tags2.pop();
            }

            store.dispatch(setHistoryTags(tags2));
        }
    }

    function removeHisTag(index: number) {
        let tags2 = [...props.hisTags];
        tags2.splice(index, 1);
        store.dispatch(setHistoryTags(tags2));
    }

    function renderHisTag(item: any, index: number) {
        // console.debug('tags -->', item);

        let color: string;
        let removable: boolean = false; // TODO 以前是true，有问题待解决
        if (pathname === item.url) {
            color = 'orange';
            removable = false;
        } else if (index % 2) {
            color = 'blue';
        } else {
            color = 'green';
        }

        return <Tag 
            key={item.url}
            className="m-mainframe_context-mainheader-tabs-tab" 
            color={color} 
            closable={removable}
            onClick={e => navigate(item.url)}
            onClose={e => removeHisTag(index)}
        >{item.label}</Tag>
    }

    return (
        <div className="m-mainframe_context-mainheader">
            <div className="m-mainframe_context-mainheader-tabs">
                <div className="m-mainframe_context-mainheader-tabs-shifter">
                    <div className="m-mainframe_context-mainheader-breadcrumb">
                        <Breadcrumb>
                            {navItems.map(item => {
                                return <Breadcrumb.Item key={item.ID}>{item.label}</Breadcrumb.Item>
                            })}
                        </Breadcrumb>
                    </div>
                    <div className="m-mainframe_context-mainheader-tabs-group">
                        {props.hisTags.map(renderHisTag)}
                    </div>
                </div>
            </div>
            <Space size={16}>
                <strong>mysql主机: </strong>
                <Tag>{`${mysqlConfig.MYSQL_HOST}:${mysqlConfig.MYSQL_PORT}`}</Tag>

                <strong>dify主机: </strong>
                <Select style={{ width: 130 }} options={props.difyFrontHostOptions.map(option => ({ label: option, value: option }))} value={props.difyFrontHost} onChange={e => store.dispatch(setFrontHost(e))} />
                
                <strong>显示模式</strong><Switch checked={props.showAll} unCheckedChildren="公共" checkedChildren="全部" onChange={e => store.dispatch(setShowAll(e))} />
                {/* {userLabel} */}
                {settingLabel}
                {/* <Button type="text" icon={<FullscreenOutlined />}>全屏</Button> */}
                {/* <Button danger type="primary" icon={<LogoutOutlined />} style={{ width: 40 }} onClick={() => signOut()}></Button> */}
            </Space>
        </div>
    )
}

export default connect(mapStateToProps)(WorkspaceHeader);