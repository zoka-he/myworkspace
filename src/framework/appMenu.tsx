import { Menu, Switch } from "antd";
import { ItemType } from "antd/es/menu/hooks/useItems";
import { connect, useSelector } from "react-redux";
import { IRootState } from "../store";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { setShowAll } from '@/src/store/navigatorSlice';
import { useDispatch } from "react-redux";

interface IAppMenuProps {
    navMenu: any[]
    showAll: boolean
    openKeys: string[]
    onOpenChange: (keys: string[]) => void
}

const mapStateToProps = (state: IRootState) => {
    return {
        navMenu: state.navigatorSlice.navMenu,
        loginUser: state.loginSlice.user,
        menuSearchKey: state.navigatorSlice.menuSearchKey,
        showAll: state.navigatorSlice.showAll
    }
}

function AppMenu(props: IAppMenuProps) {
    let dispatch = useDispatch();
    let navigate = useNavigate();
    const themeMode = useSelector((state: IRootState) => state.themeSlice.themeConfig.algorithm);
    const showAll = useSelector((state: IRootState) => state.navigatorSlice.showAll);
    let [menu, setMenu] = useState<any[]>(props.navMenu);

    useEffect(() => {
        console.debug('showAll -->', props.showAll);

        function filterMenu(menu: any[]): any[] {
            let menu2:any[] = [];

            menu.forEach(item => {
                if (item.is_enable === 'N') {
                    return;
                }

                if (item.is_secret === 'Y' && !props.showAll) {
                    return;
                }

                console.debug('item -->', item);
                console.debug('showAll -->', props.showAll);

                if (item.children instanceof Array) {
                    let children2 = filterMenu(item.children);
                    if (children2.length) {
                        menu2.push({ ...item, children: children2 });
                    }
                } else if (typeof item.label === 'string') {
                    menu2.push({ ...item });
                }
            });

            // console.debug('menu2 -->', menu2);

            return menu2;
        }


        setMenu(filterMenu(props.navMenu));
    }, [props.navMenu, props.showAll]);

    /** 子菜单的直接子项中是否包含 group（有则弹出层横向排布，否则纵向） */
    function hasGroupInChildren(children: any[]): boolean {
        return children.some((c: any) => c?.type === 'group');
    }

    /** Normalize menu items for Ant Design Menu: only pass key/label/children so ID, PID, etc. never reach the DOM. */
    function toMenuItems(menuItems: any[]): ItemType[] {
        return menuItems.map(item => {
            const result: ItemType = {
                key: item.type === 'group' ? 'group_' + String(item.ID ?? '') : String(item.key ?? ''),
                label: item.label,
                type: item.type
            };
            if (item.children?.length) {
                result.children = toMenuItems(item.children);
                if (hasGroupInChildren(item.children)) {
                    (result as any).popupClassName = 'f-app-menu-subpopup';
                }
            }
            return result;
        });
    }

    function onMenuClick(e: any) {
        let url = e.keyPath[0];
        navigate(url);
    }

    return (
        <div className="f-flex-row f-align-items-center px-5">
            <style>{`
                .f-app-menu-subpopup {
                    min-width: auto !important;
                }
                .f-app-menu-subpopup .ant-menu-sub,
                .f-app-menu-subpopup .ant-menu-sub.ant-menu {
                    display: flex !important;
                    flex-direction: row !important;
                    flex-wrap: wrap !important;
                    min-width: auto !important;
                    width: auto !important;
                    border-right: none !important;
                }
                .f-app-menu-subpopup .ant-menu-item,
                .f-app-menu-subpopup .ant-menu-submenu .ant-menu-submenu-title {
                    margin: 0 12px !important;
                    border-radius: 4px;
                    padding-inline: 4px !important;
                    width: auto !important;
                    min-width: 8em !important;
                }
            `}</style>
            <Switch checked={showAll} unCheckedChildren="公共" checkedChildren="全部" onChange={e => dispatch(setShowAll(e))} />
            <Menu
                className="f-flex-1"
                theme={themeMode === 'dark' ? 'dark' : 'light'}
                mode="horizontal"
                inlineIndent={16}
                items={toMenuItems(menu)}
                onClick={e => onMenuClick(e)}
                triggerSubMenuAction="click"
                // openKeys={openKeys}
                // onOpenChange={onOpenChange}
            />
        </div>
    )
}

export default connect(mapStateToProps)(AppMenu);