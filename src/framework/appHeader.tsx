'use client';

import { connect } from "react-redux"
import { IRootState } from "../store"
import { Breadcrumb, ConfigProvider, Input, theme } from "antd"
import { SearchOutlined } from '@ant-design/icons';
import store from '@/src/store';
import { setMenuSearchKey } from "@/src/store/navigatorSlice";
import { IPermission } from "../business/user/permission/IPermission";
import { useLocation } from "react-router-dom";



const mapStateToProps = (state: IRootState) => {
    return {
        navMenu: state.navigatorSlice.navMenu,
        searchKey: state.navigatorSlice.menuSearchKey,
        loginUser: state.loginSlice.user
    }
}

interface IAppHeaderProps {
    searchKey: string
    className?: string
    urlMap?: Map<string, IPermission>
    permMap?: Map<number, IPermission>
}

function AppHeader(props: IAppHeaderProps) {
    // function onSearch(value: string) {
    //     store.dispatch(setMenuSearchKey(value));
    // }

    // let isShifterActive = !!props.searchKey;
    const location = useLocation();

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

    return (
        <div className={`m-app-header ${props.className}`}>
            {/* <div className={`m-app-header_shifter${isShifterActive ? ' active' : ''}`}> */}
                {/* <h2 className="m-app-header_logo" style={{ color: 'white', lineHeight: '46px' }}>工作台</h2> */}
                <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, inherit: false }}>
                    <Breadcrumb
                        style={{ lineHeight: '46px', transform: 'translateY(2px)' }}
                        items={navItems.map(item => ({
                            key: item.ID,
                            title: <span className="font-bold text-base">{item.label}</span>,
                        }))}
                    />
                </ConfigProvider>
                {/* <div className={`m-app-header_research`}>
                    <Input 
                        value={props.searchKey}
                        onChange={ e => onSearch((e.target as HTMLInputElement).value) }
                        placeholder="在菜单中搜索..." 
                        prefix={<SearchOutlined/>}
                        allowClear
                    />
                </div> */}
            {/* </div> */}
        </div>
    )
}

export default connect(mapStateToProps)(AppHeader);