import type { PropsWithChildren } from 'react';
import './AppMenuSubmenuPopup.css';

/** 与内层 Menu 的 popupClassName 一致，便于复用同一套浮层样式 */
export const APP_MENU_SUBMENU_POPUP_CLASS_NAME = 'f-app-menu-subpopup';

/** 毛玻璃浮层外壳（顶层 Dropdown 与内层 SubMenu 共用） */
export const APP_MENU_SUBMENU_POPUP_SURFACE_CLASS = 'f-app-menu-submenu-popup-surface';

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
