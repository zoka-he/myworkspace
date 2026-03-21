import { Dropdown, Menu, Switch } from "antd";

import type { MenuProps } from "antd";

import { connect, useSelector } from "react-redux";

import { AppMenuSubmenuPopup, APP_MENU_SUBMENU_POPUP_CLASS_NAME, APP_MENU_SUBMENU_POPUP_SURFACE_CLASS } from "./AppMenuSubmenuPopup";

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



type MenuItemType = NonNullable<MenuProps['items']>[number];



function findItemByKey(items: any[] | undefined, key: string): any | undefined {

    if (!items?.length) {

        return undefined;

    }

    for (const it of items) {

        const itemKey = it.type === 'group' ? 'group_' + String(it.ID ?? '') : String(it.key ?? '');

        if (itemKey === key) {

            return it;

        }

        const found = findItemByKey(it.children, key);

        if (found) {

            return found;

        }

    }

    return undefined;

}



function AppMenu(props: IAppMenuProps) {

    let dispatch = useDispatch();

    let navigate = useNavigate();

    const themeMode = useSelector((state: IRootState) => state.themeSlice.themeConfig.algorithm);

    const menuTheme: 'light' | 'dark' = themeMode === 'dark' ? 'dark' : 'light';

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

    /**
     * 子菜单含 group 时，按“列”进行打包：
     * - 每个 group 的体积 = 分组名(1) + 入口数量
     * - 单列阈值为 10
     * - 若当前列放不下新 group，则新开一列
     * - group 不可切分；即使单个 group > 10，也整组放在单列里
     */
    function regroupChildrenForHorizontalLayout(children: any[]): any[] {
        if (!hasGroupInChildren(children)) {
            return children;
        }

        const maxItemsPerColumn = 10;
        const columns: any[] = [];
        let columnIndex = 1;
        let currentColumnGroups: any[] = [];
        let currentColumnUnits = 0;

        const flushColumn = () => {
            if (!currentColumnGroups.length) {
                return;
            }
            columns.push({
                type: 'group',
                key: `group_col_${columnIndex++}`,
                label: '',
                children: currentColumnGroups,
            });
            currentColumnGroups = [];
            currentColumnUnits = 0;
        };

        children.forEach((child: any, index: number) => {
            const normalizedGroup =
                child?.type === 'group' && Array.isArray(child.children)
                    ? child
                    : {
                        type: 'group',
                        key: `group_wrap_${String(child?.key ?? child?.ID ?? index)}`,
                        label: '',
                        children: [child],
                    };

            const groupUnits = 1 + (Array.isArray(normalizedGroup.children) ? normalizedGroup.children.length : 0);

            if (currentColumnGroups.length && currentColumnUnits + groupUnits > maxItemsPerColumn) {
                flushColumn();
            }

            currentColumnGroups.push(normalizedGroup);
            currentColumnUnits += groupUnits;

            // 单个 group 超阈值时不切分：独占一列，后续 group 进入新列
            if (groupUnits > maxItemsPerColumn) {
                flushColumn();
            }
        });

        flushColumn();
        return columns;
    }



    function buildSubMenu(item: any): { children: MenuItemType[]; popupClassName?: string; popupOffset?: number[] } {
        const packedChildren = hasGroupInChildren(item.children)
            ? regroupChildrenForHorizontalLayout(item.children)
            : item.children;

        const cls = [
            APP_MENU_SUBMENU_POPUP_SURFACE_CLASS,
            `${APP_MENU_SUBMENU_POPUP_SURFACE_CLASS}--${menuTheme}`,
        ];

        if (hasGroupInChildren(item.children)) {

            cls.push(APP_MENU_SUBMENU_POPUP_CLASS_NAME);

        }

        return {

            children: toMenuItems(packedChildren, false),

            popupClassName: cls.join(' '),

            popupOffset: [0, 10],

        };

    }



    /** Normalize menu items for Ant Design Menu: only pass key/label/children so ID, PID, etc. never reach the DOM. */

    function toMenuItems(menuItems: any[], enableRegroup: boolean = true): MenuItemType[] {
        const normalizedItems = enableRegroup
            ? regroupChildrenForHorizontalLayout(menuItems)
            : menuItems;

        return normalizedItems.map(item => {

            const result: MenuItemType = {

                key: item.type === 'group'
                    ? String(item.key ?? ('group_' + String(item.ID ?? '')))
                    : String(item.key ?? ''),

                label: item.label,

                type: item.type

            };

            if (item.children?.length) {
                if (item.type === 'group') {
                    (result as any).children = toMenuItems(item.children, false);
                } else {
                    Object.assign(result as any, buildSubMenu(item));
                }

            }

            return result;

        });

    }



    function onMenuClick(e: any) {

        const key = String(e.key);

        const hit = findItemByKey(menu, key);

        if (hit?.children?.length) {

            return;

        }

        navigate(key);

    }



    /** 顶层横向菜单：带子项的项用 Dropdown.popupRender 挂载自定义浮层组件，再嵌套内层 Menu */

    function buildTopLevelItems(): MenuItemType[] {

        return menu.map((item: any) => {

            const result: MenuItemType = {

                key: item.type === 'group' ? 'group_' + String(item.ID ?? '') : String(item.key ?? ''),

                label: item.label,

                type: item.type

            };

            if (!item.children?.length) {

                return result;

            }

            if (item.type === 'group') {

                Object.assign(result as any, buildSubMenu(item));

                return result;

            }

            const hasGroupLayout = hasGroupInChildren(item.children);

            (result as any).label = (

                <Dropdown

                    trigger={['click']}

                    placement="bottomCenter"

                    align={{ offset: [0, 0] }}

                    rootClassName="f-app-menu-dropdown-root"

                    overlayStyle={{ padding: 0, background: 'transparent', boxShadow: 'none', width: 'max-content', maxWidth: 'min(100vw - 24px, 960px)' }}

                    popupRender={() => (

                        <AppMenuSubmenuPopup hasGroupLayout={hasGroupLayout} theme={menuTheme}>

                            <Menu

                                className="f-app-menu-submenu-root-menu"

                                theme={menuTheme}

                                mode="vertical"

                                style={hasGroupLayout ? {
                                    display: 'flex',
                                    flexDirection: 'row',
                                    flexWrap: 'nowrap',
                                    alignItems: 'flex-start',
                                    columnGap: 12,
                                    maxHeight: 'none',
                                    overflowX: 'auto',
                                    overflowY: 'visible',
                                } : undefined}

                                inlineIndent={16}

                                items={toMenuItems(item.children)}

                                onClick={onMenuClick}

                                triggerSubMenuAction="click"

                            />

                        </AppMenuSubmenuPopup>

                    )}

                >

                    <span

                        className="f-app-menu-submenu-trigger"

                        onClick={e => e.stopPropagation()}

                    >

                        {item.label}

                    </span>

                </Dropdown>

            );

            return result;

        });

    }



    return (

        <div className="f-flex-row f-align-items-center px-5">

            <Switch checked={showAll} unCheckedChildren="公共" checkedChildren="全部" onChange={e => dispatch(setShowAll(e))} />

            <Menu

                className="f-flex-1"

                theme={menuTheme}

                mode="horizontal"

                inlineIndent={16}

                items={buildTopLevelItems()}

                onClick={onMenuClick}

                triggerSubMenuAction="click"

                // openKeys={openKeys}

                // onOpenChange={onOpenChange}

            />

        </div>

    )

}



export default connect(mapStateToProps)(AppMenu);

