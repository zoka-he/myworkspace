'use client';

import { useEffect } from 'react';

const BLUR_STYLES = `
/* 主框架顶部栏毛玻璃：运行时注入 + !important，避免被 @layer 或其它样式覆盖，backdrop 才能正确生效 */
body .app-layout-header {
  background: var(--m-main-header-glass) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
}
body .ant-modal-root {
  position: fixed !important;
  inset: 0 !important;
  background: rgba(0, 0, 0, 0.25) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
  pointer-events: none;
  transition: background 0.25s ease, backdrop-filter 0.25s ease, -webkit-backdrop-filter 0.25s ease;
}
body .ant-modal-root:has(.ant-modal-wrap[style*="display: none"]) {
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  pointer-events: none !important;
}
body .ant-modal-root .ant-modal-mask {
  background: transparent !important;
  pointer-events: auto;
}
body .ant-modal-root .ant-modal-wrap {
  pointer-events: auto;
}
body .ant-drawer {
  transition: background 0.25s ease, backdrop-filter 0.25s ease, -webkit-backdrop-filter 0.25s ease;
}
body .ant-drawer.ant-drawer-open {
  background: rgba(0, 0, 0, 0.25) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
}
body .ant-drawer-mask {
  background: transparent !important;
}
`;

const STYLE_ID = 'antd-modal-drawer-blur';

/**
 * 客户端挂载后注入 Modal/Drawer 遮罩毛玻璃样式，
 * 保证在 antd CSS-in-JS 之后插入，避免被覆盖。
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
  return null;
}
