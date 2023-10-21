import { Breadcrumb, Button, Space } from "antd";
import { connect } from "react-redux";
import { IRootState } from "../store";
import { useSession, signOut } from 'next-auth/react';
import { useNavigate } from "react-router-dom";
import { UserOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { useRef } from "react";
import { IPermission } from "@/pages/api/user/permission/type";

const mapStateToProps = (state: IRootState) => {
    return {
        navMenu: state.navigatorSlice.navMenu,
        loginUser: state.loginSlice.user
    }
}


interface IWorkspaceHeaderProps {
    loginUser: any
    permMap?: Map<number, IPermission>
    urlMap?: Map<string, IPermission>
}

function WorkspaceHeader(props: IWorkspaceHeaderProps) {
    let session = useSession();
    let navigate = useNavigate();

    /**
     * 渲染面包屑
     * @returns 
     */
    function renderBreadcrumb() {
        if (!props.urlMap || !props.permMap) {
            return null;
        }

        let pathname = location.pathname;
        let menuItem = props.urlMap.get(pathname);
        console.debug('menuItem', menuItem);

        let breadcrumbItems = [];
        while (menuItem) {
            breadcrumbItems.unshift(<Breadcrumb.Item key={menuItem.ID}>{menuItem.label}</Breadcrumb.Item>);

            if (typeof menuItem.PID === 'number') {
                menuItem = props.permMap.get(menuItem.PID);
            } else {
                menuItem = undefined;
            }
        }

        return <Breadcrumb>{breadcrumbItems}</Breadcrumb>;
    }

    let userLabel = null;
    if (props?.loginUser?.nickname || session?.data?.user?.name) {
        const openProfile = () => navigate('/user/profile?tabKey=1');
        userLabel = <Button type="text" icon={<UserOutlined/>} onClick={openProfile}>{props?.loginUser?.nickname || session?.data?.user?.name}</Button>
    }

    let settingLabel = (
        <Button type="text" icon={<SettingOutlined />} onClick={() => navigate('/user/profile?tabKey=2')}>设置</Button>
    )

    return (
        <div className="m-mainframe_context-mainheader">
            <span>{renderBreadcrumb()}</span>
            <Space size={16}>
                {userLabel}
                {settingLabel}
                {/* <Button type="text" icon={<FullscreenOutlined />}>全屏</Button> */}
                <Button danger type="primary" icon={<LogoutOutlined />} style={{ width: 40 }} onClick={() => signOut()}></Button>
            </Space>
        </div>
    )
}

export default connect(mapStateToProps)(WorkspaceHeader);