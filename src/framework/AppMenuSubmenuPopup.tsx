import type { PropsWithChildren } from 'react';

import './AppMenuSubmenuPopup.css';



/** 与内层 Menu 的 popupClassName 一致，便于复用同一套浮层样式 */

export const APP_MENU_SUBMENU_POPUP_CLASS_NAME = 'f-app-menu-subpopup';



/** 毛玻璃浮层外壳（顶层 Dropdown 与内层 SubMenu 共用） */

export const APP_MENU_SUBMENU_POPUP_SURFACE_CLASS = 'f-app-menu-submenu-popup-surface';

/**
 * 子菜单含 group 时，按“列”进行打包：
 * - 每个 group 的体积 = 分组名(1) + 入口数量
 * - 单列阈值为 10
 * - 若当前列放不下新 group，则新开一列
 * - group 不可切分；即使单个 group > 10，也整组放在单列里
 */
export function regroupChildrenForHorizontalLayout(children: any[]): any[] {
    const hasGroupInChildren = (items: any[]) => items.some((c: any) => c?.type === 'group');

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



/**

 * 自定义子菜单浮层根节点（通过 Dropdown 的 popupRender 挂载，不是仅注入样式）。

 * 当需要「含 group 横向排布」等样式时，为根节点加上 APP_MENU_SUBMENU_POPUP_CLASS_NAME。

 */

export function AppMenuSubmenuPopup(

    props: PropsWithChildren<{

        hasGroupLayout?: boolean;

        className?: string;

        /** 与内层 Menu 的 theme 一致，用于毛玻璃明暗样式 */

        theme?: 'light' | 'dark';

    }>

) {

    const { hasGroupLayout, className, children, theme = 'light' } = props;

    const surface = APP_MENU_SUBMENU_POPUP_SURFACE_CLASS;

    const themeCls = `${surface}--${theme}`;

    return (

        <div

            className={[surface, themeCls, hasGroupLayout ? APP_MENU_SUBMENU_POPUP_CLASS_NAME : '', className ?? '']

                .filter(Boolean)

                .join(' ')}

        >

            {children}

        </div>

    );

}

