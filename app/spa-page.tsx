'use client';

import '@/src/init';
import { Provider, useSelector } from 'react-redux';
import store, { IRootState } from '@/src/store';
import dynamic from 'next/dynamic';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { IMessage } from '@stomp/stompjs';

import { App as AntdApp, ConfigProvider } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
import { getAlgorithm } from '@/src/config/theme';
import zhCN from 'antd/locale/zh_CN';

import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/src/config/wagmi';
import { RabbitMQProvider } from '@/src/components/context/aiNovel';
import mqConfig from '@/src/config/rabbitmq';
import MQHolder from '@/src/components/context/aiNovel/mqHolder';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NoticeConsumer from '@/src/components/mq/noticeConsumer';
import AntdModalDrawerBlurStyles from '@/src/components/AntdModalDrawerBlurStyles';
import { AntdAppMessageBridge } from '@/src/utils/antdAppMessage';
import mysqlConfig from '@/src/config/mysql';
import { MAIN_SCROLL_CONTAINER_ID } from '@/src/framework';

const queryClient = new QueryClient();
const MyRouter = dynamic(() => import('@/src/router'), { ssr: false });

function AppCore() {
  const { message } = AntdApp.useApp();
  const [stompConfig, setStompConfig] = useState<{
    wsUrl: string;
    managementUrl: string;
    login: string;
    passcode: string;
    vhost: string;
  } | null>(null);

  function onMessage(_message: IMessage) {}

  function onConnectionChange(connected: boolean) {
    if (document && document.visibilityState === 'hidden') {
      // 如果页面隐藏，则不显示连接成功或连接失败的消息
      return;
    }

    if (connected) {
      message.success('已连接后端队列');
    } else {
      message.error('已断开后端队列');
    }
  }

  function onError(error: string) {
    message.error('后端队列连接错误: ' + error);
  }

  const getRabbitMQConfig = (runtimeConfig?: {
    frontendUrl?: string;
    host?: string;
    port?: string;
    managementUrl?: string;
  }) => {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    let hostname = window.location.hostname;

    if (process.env.NODE_ENV === 'development') {
      hostname = mysqlConfig.MYSQL_HOST;
    }

    const wsPort = runtimeConfig?.port || process.env.NEXT_PUBLIC_RABBITMQ_STOMP_PORT || '28010';
    const mgmtPort = process.env.NEXT_PUBLIC_RABBITMQ_MANAGEMENT_PORT || '28008';
    const wsUrl = runtimeConfig?.frontendUrl?.trim()
      ? runtimeConfig.frontendUrl
      : `${protocol}//${runtimeConfig?.host || hostname}:${wsPort}/ws`;
    const managementUrl = runtimeConfig?.managementUrl?.trim()
      ? runtimeConfig.managementUrl
      : `${protocol}//${runtimeConfig?.host || hostname}:${mgmtPort}`;

    return {
      wsUrl,
      managementUrl,
    };
  };

  useEffect(() => {
    let cancelled = false;
    const loadStompConfig = async () => {
      try {
        const resp = await fetch('/api/web/rabbitmq/stomp-config', { cache: 'no-store' });
        const json = await resp.json();
        if (!resp.ok || !json?.success || !json?.data) {
          throw new Error(json?.error || `HTTP ${resp.status}`);
        }
        const rabbitMQConfig = getRabbitMQConfig({
          frontendUrl: json.data.frontendUrl,
          host: json.data.host,
          port: json.data.port,
          managementUrl: json.data.managementUrl,
        });
        if (!cancelled) {
          setStompConfig({
            ...rabbitMQConfig,
            login: json.data.login || '',
            passcode: json.data.passcode || '',
            vhost: json.data.vhost || '/',
          });
        }
      } catch (error) {
        console.error('[AppCore] Failed to load STOMP runtime config:', error);
        if (!cancelled) {
          const rabbitMQConfig = getRabbitMQConfig();
          setStompConfig({
            ...rabbitMQConfig,
            login: '',
            passcode: '',
            vhost: '/',
          });
        }
      }
    };
    loadStompConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RabbitMQProvider
          config={{
            ...mqConfig,
            wsUrl: stompConfig?.wsUrl || mqConfig.wsUrl,
            managementUrl: stompConfig?.managementUrl || mqConfig.managementUrl,
            login: stompConfig?.login || mqConfig.login,
            passcode: stompConfig?.passcode || mqConfig.passcode,
            vhost: stompConfig?.vhost || mqConfig.vhost,
          }}
        >
          <MyRouter />
          {stompConfig?.login && stompConfig?.passcode ? (
            <MQHolder
              onMessage={onMessage}
              onConnectionChange={onConnectionChange}
              onError={onError}
            >
              <NoticeConsumer />
            </MQHolder>
          ) : null}
        </RabbitMQProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function ThemedApp() {
  const themeConfig = useSelector((state: IRootState) => state.themeSlice.themeConfig);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeConfig.name);
  }, [themeConfig.name]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        cssVar: true,
        algorithm: getAlgorithm(themeConfig.algorithm),
        token: themeConfig.token,
      }}
    >
      <AntdModalDrawerBlurStyles />
      <AntdApp>
        <AntdAppMessageBridge />
        <StyleProvider hashPriority="low">
          <AppCore />
        </StyleProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

export default function AppPageContent() {
  return (
    <>
      <main id={MAIN_SCROLL_CONTAINER_ID} className="h-screen overflow-y-auto">
        <Provider store={store}>
          <ThemedApp />
        </Provider>
      </main>

      <Script src="/scripts/initGaodeSafeCode.js" strategy="beforeInteractive" />
      <Script
        src="https://webapi.amap.com/maps?v=2.0&key=aaf9abee1eb38e393da832ed8d387f4b&plugin=AMap.PlaceSearch,AMap.Driving,AMap.Geocoder"
        strategy="beforeInteractive"
      />
      <script src="https://api.map.baidu.com/api?type=webgl&v=1.0&ak=wODxcvAVzRcq8Y76oqFHvSsmm338mZ19" />
    </>
  );
}
