'use client';

import '@/src/init';
import { Provider, useSelector } from 'react-redux';
import store, { IRootState } from '@/src/store';
import dynamic from 'next/dynamic';
import Script from 'next/script';
import { useEffect } from 'react';
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

  const getRabbitMQConfig = () => {
    if (typeof window === 'undefined') {
      const host = process.env.RABBITMQ_STOMP_HOST || 'localhost';
      const port = process.env.RABBITMQ_STOMP_PORT || '28010';
      return {
        wsUrl: `http://${host}:${port}/ws`,
        managementUrl: `http://${host}:28008`,
      };
    }

    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    let hostname = window.location.hostname;

    if (process.env.NODE_ENV === 'development') {
      hostname = mysqlConfig.MYSQL_HOST;
    }

    const wsPort = process.env.NEXT_PUBLIC_RABBITMQ_STOMP_PORT || '28010';
    const mgmtPort = process.env.NEXT_PUBLIC_RABBITMQ_MANAGEMENT_PORT || '28008';

    return {
      wsUrl: `${protocol}//${hostname}:${wsPort}/ws`,
      managementUrl: `${protocol}//${hostname}:${mgmtPort}`,
    };
  };

  const rabbitMQConfig = getRabbitMQConfig();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RabbitMQProvider
          config={{
            ...mqConfig,
            wsUrl: rabbitMQConfig.wsUrl,
            managementUrl: rabbitMQConfig.managementUrl,
          }}
        >
          <MyRouter />
          <MQHolder
            onMessage={onMessage}
            onConnectionChange={onConnectionChange}
            onError={onError}
          >
            <NoticeConsumer />
          </MQHolder>
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
