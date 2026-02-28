/**
 * 与 AntdApp 的 message/notification 桥接，供未使用 App.useApp() 的组件使用。
 * 使用方式：把 import { message } from 'antd' 改为 import { message } from '@/src/utils/antdAppMessage'
 * 需在根布局中渲染 <AntdAppMessageBridge />（放在 <AntdApp> 内部）。
 */

'use client';

import { useEffect } from 'react';
import { App } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type { NotificationInstance } from 'antd/es/notification/interface';

declare global {
  interface Window {
    __ANTD_APP_MESSAGE__?: MessageInstance | null;
    __ANTD_APP_NOTIFICATION__?: NotificationInstance | null;
  }
}

const noopThenable = { then: (fn?: (v: boolean) => unknown) => (fn ? fn(true) : noopThenable), catch: () => noopThenable };

function getMessage(): MessageInstance | null {
  return (typeof window !== 'undefined' && window.__ANTD_APP_MESSAGE__) ?? null;
}

function getNotification(): NotificationInstance | null {
  return (typeof window !== 'undefined' && window.__ANTD_APP_NOTIFICATION__) ?? null;
}

/** 未挂载时调用的空实现 */
const noopMessage: MessageInstance = {
  info: () => noopThenable as ReturnType<MessageInstance['info']>,
  success: () => noopThenable as ReturnType<MessageInstance['success']>,
  error: () => noopThenable as ReturnType<MessageInstance['error']>,
  warning: () => noopThenable as ReturnType<MessageInstance['warning']>,
  loading: () => noopThenable as ReturnType<MessageInstance['loading']>,
  open: () => noopThenable as ReturnType<MessageInstance['open']>,
  destroy: () => {},
};

const noopNotification: NotificationInstance = {
  success: () => noopThenable as ReturnType<NotificationInstance['success']>,
  error: () => noopThenable as ReturnType<NotificationInstance['error']>,
  info: () => noopThenable as ReturnType<NotificationInstance['info']>,
  warning: () => noopThenable as ReturnType<NotificationInstance['warning']>,
  open: () => noopThenable as ReturnType<NotificationInstance['open']>,
  destroy: () => {},
};

/** 代理到 AntdApp 的 message，供全项目 import（替换 import { message } from 'antd'） */
export const message: MessageInstance = {
  info: (...args: Parameters<MessageInstance['info']>) => (getMessage()?.info(...args) ?? noopThenable) as ReturnType<MessageInstance['info']>,
  success: (...args: Parameters<MessageInstance['success']>) => (getMessage()?.success(...args) ?? noopThenable) as ReturnType<MessageInstance['success']>,
  error: (...args: Parameters<MessageInstance['error']>) => (getMessage()?.error(...args) ?? noopThenable) as ReturnType<MessageInstance['error']>,
  warning: (...args: Parameters<MessageInstance['warning']>) => (getMessage()?.warning(...args) ?? noopThenable) as ReturnType<MessageInstance['warning']>,
  loading: (...args: Parameters<MessageInstance['loading']>) => (getMessage()?.loading(...args) ?? noopThenable) as ReturnType<MessageInstance['loading']>,
  open: (args: Parameters<MessageInstance['open']>[0]) => (getMessage()?.open(args) ?? noopThenable) as ReturnType<MessageInstance['open']>,
  destroy: (key?: Parameters<MessageInstance['destroy']>[0]) => getMessage()?.destroy(key) ?? noopMessage.destroy(key),
};

/** 代理到 AntdApp 的 notification */
export const notification: NotificationInstance = {
  success: (...args: Parameters<NotificationInstance['success']>) => (getNotification()?.success(...args) ?? noopThenable) as ReturnType<NotificationInstance['success']>,
  error: (...args: Parameters<NotificationInstance['error']>) => (getNotification()?.error(...args) ?? noopThenable) as ReturnType<NotificationInstance['error']>,
  info: (...args: Parameters<NotificationInstance['info']>) => (getNotification()?.info(...args) ?? noopThenable) as ReturnType<NotificationInstance['info']>,
  warning: (...args: Parameters<NotificationInstance['warning']>) => (getNotification()?.warning(...args) ?? noopThenable) as ReturnType<NotificationInstance['warning']>,
  open: (args: Parameters<NotificationInstance['open']>[0]) => (getNotification()?.open(args) ?? noopThenable) as ReturnType<NotificationInstance['open']>,
  destroy: (key?: Parameters<NotificationInstance['destroy']>[0]) => getNotification()?.destroy(key) ?? noopNotification.destroy(key),
};

/** 在 AntdApp 内部挂载一次，将 message/notification 写入 window 供上述代理使用 */
export function AntdAppMessageBridge() {
  const { message: msg, notification: notif } = App.useApp();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__ANTD_APP_MESSAGE__ = msg;
    window.__ANTD_APP_NOTIFICATION__ = notif;
    return () => {
      window.__ANTD_APP_MESSAGE__ = null;
      window.__ANTD_APP_NOTIFICATION__ = null;
    };
  }, [msg, notif]);
  return null;
}
