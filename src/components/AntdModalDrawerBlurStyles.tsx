'use client';

import React, { useEffect } from 'react';

export const ANTD_MESSAGE_CONTAINER_ID = 'antd-message-container';

const messageContainerStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1050,
  pointerEvents: 'none',
  overflow: 'visible',
};

/** 供 AntdApp message/notification 使用的 getContainer，挂载到 body 下专用 div，避免被主布局 overflow/层叠盖住 */
export function getAntdMessageContainer(): HTMLElement {
  if (typeof document === 'undefined') return null!;
  return document.getElementById(ANTD_MESSAGE_CONTAINER_ID) || document.body;
}

const BLUR_STYLES = `
/* 主框架顶部栏毛玻璃：运行时注入 + !important，避免被 @layer 或其它样式覆盖，backdrop 才能正确生效 */
body .app-layout-header {
  background: var(--m-main-header-glass) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
}
/* message 挂点不挡点击（含 antd css-var / css-dev-only 根节点），仅 notice 可点 */
body .ant-message,
body .ant-message.ant-message-top,
body .ant-message[class*="css-var"],
body .ant-message[class*="ant-message-css-var"],
body [class*="css-dev-only-do-not-override"].ant-message,
body [class*="ant-message"]:not(.ant-message-notice-wrapper):not([class*="ant-message-notice-wrapper"]) {
  z-index: 1050 !important;
  pointer-events: none !important;
}
body .ant-message .ant-message-notice-wrapper,
body [class*="ant-message-notice-wrapper"] {
  pointer-events: auto !important;
}
body .ant-notification,
body [class*="ant-notification"]:not(.ant-notification-notice-wrapper):not([class*="ant-notification-notice-wrapper"]) {
  z-index: 1050 !important;
  pointer-events: none !important;
}
body .ant-notification .ant-notification-notice-wrapper,
body [class*="ant-notification-notice-wrapper"] {
  pointer-events: auto !important;
}
/* 挂到 body 的 message/notification 的直系父节点（如 wrapCSSVar 的 div）也不挡点击 */
body > div:has(> .ant-message),
body > div:has(> [class*="ant-message"]),
body > div:has(> .ant-notification),
body > div:has(> [class*="ant-notification"]) {
  pointer-events: none !important;
}
body .ant-modal-root {
  position: fixed !important;
  inset: 0 !important;
  z-index: 1000 !important;
  background: rgba(0, 0, 0, 0.25) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
  pointer-events: none !important;
  transition: background 0.25s ease, backdrop-filter 0.25s ease, -webkit-backdrop-filter 0.25s ease;
}
body .ant-modal-root:has(.ant-modal-wrap[style*="display: none"]) {
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
/* mask 默认不挡点击，仅在有可见弹窗时才可点（遮罩关闭） */
body .ant-modal-root .ant-modal-mask {
  background: transparent !important;
  pointer-events: none !important;
}
body .ant-modal-root:has(.ant-modal-wrap:not([style*="display: none"])) .ant-modal-mask {
  pointer-events: auto !important;
}
body .ant-modal-root .ant-modal-wrap {
  pointer-events: auto !important;
}
body .ant-drawer {
  transition: background 0.25s ease, backdrop-filter 0.25s ease, -webkit-backdrop-filter 0.25s ease;
  pointer-events: none !important;
}
body .ant-drawer.ant-drawer-open {
  background: rgba(0, 0, 0, 0.25) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
  pointer-events: auto !important;
}
body .ant-drawer-mask {
  background: transparent !important;
  pointer-events: none !important;
}
body .ant-drawer.ant-drawer-open .ant-drawer-mask {
  pointer-events: auto !important;
}
body .ant-drawer-content-wrapper {
  pointer-events: auto !important;
}
/* 菜单下拉浮层毛玻璃：亮色主题 */
body .ant-menu.ant-menu-sub.ant-menu-vertical {
  background: rgba(255, 255, 255, 0.65) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
}
/* 菜单下拉浮层毛玻璃：dark 主题（html[data-theme="dark"]）或 ant-menu-dark 子菜单 */
html[data-theme="dark"] body .ant-menu.ant-menu-sub.ant-menu-vertical,
body .ant-menu-dark .ant-menu.ant-menu-sub.ant-menu-vertical {
  background: rgba(30, 30, 30, 0.75) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
}
/* Select 下拉浮层毛玻璃：亮色主题 */
body .ant-select-dropdown {
  background: rgba(255, 255, 255, 0.65) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
}
/* Select 下拉浮层毛玻璃：dark 主题 */
html[data-theme="dark"] body .ant-select-dropdown {
  background: rgba(30, 30, 30, 0.75) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
}

body .ant-tree-select-dropdown .ant-select-tree {
  background: transparent !important;
}
`;

const STYLE_ID = 'antd-modal-drawer-blur';

/** 兼容 HTML/SVG：取 class 字符串（SVG 的 className 是 SVGAnimatedString，无 includes） */
function getClassString(el: Element | null): string {
  return el?.getAttribute?.('class') ?? '';
}

/** 对 message/notification 根节点设 pointer-events: none（内联 + important），压过 antd CSS-in-JS */
function applyMessageNotificationPointerEvents() {
  const q = (sel: string) => document.querySelectorAll<HTMLElement>(sel);
  q('.ant-message').forEach((el) => {
    if (!el.classList.contains('ant-message-notice-wrapper') && !getClassString(el).includes('ant-message-notice-wrapper')) {
      el.style.setProperty('pointer-events', 'none', 'important');
    }
  });
  q('[class*="ant-message"]').forEach((el) => {
    if (!el.classList.contains('ant-message-notice-wrapper') && !getClassString(el).includes('ant-message-notice-wrapper')) {
      el.style.setProperty('pointer-events', 'none', 'important');
    }
  });
  q('.ant-message-notice-wrapper, [class*="ant-message-notice-wrapper"]').forEach((el) => {
    el.style.setProperty('pointer-events', 'auto', 'important');
  });
  q('.ant-notification, [class*="ant-notification"]').forEach((el) => {
    if (!el.classList.contains('ant-notification-notice-wrapper') && !getClassString(el).includes('ant-notification-notice-wrapper')) {
      el.style.setProperty('pointer-events', 'none', 'important');
    }
  });
  q('.ant-notification-notice-wrapper, [class*="ant-notification-notice-wrapper"]').forEach((el) => {
    el.style.setProperty('pointer-events', 'auto', 'important');
  });
  // body 下直接包住 message/notification 的 div
  document.body.querySelectorAll<HTMLElement>('div').forEach((div) => {
    const first = div.firstElementChild;
    if (first && (first.classList.contains('ant-message') || first.classList.contains('ant-notification') || getClassString(first).includes('ant-message') || getClassString(first).includes('ant-notification'))) {
      div.style.setProperty('pointer-events', 'none', 'important');
    }
  });
}

/**
 * 客户端挂载后注入 Modal/Drawer 遮罩毛玻璃样式；
 * 并用 MutationObserver 对 message/notification 挂点强制设 pointer-events，压过 antd CSS-in-JS。
 */
export default function AntdModalDrawerBlurStyles() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = BLUR_STYLES;
    document.head.appendChild(el);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    applyMessageNotificationPointerEvents();
    const run = () => {
      applyMessageNotificationPointerEvents();
      setTimeout(applyMessageNotificationPointerEvents, 150);
    };
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
