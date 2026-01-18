// import '@/styles/globals.css'
import '@/styles/common.scss';
import '@/styles/colors.scss';
import '@/styles/antd-fix.scss';
import 'antd/dist/reset.css';
import '@/styles/myapp.scss';


import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { SessionProvider, useSession } from 'next-auth/react';
import { startDetectBrowserWalletProvider } from '@/src/utils/ethereum';
import { useEffect } from 'react';

import Dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/src/config/wagmi';

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();


  useEffect(() => {

    // 初始化 dayjs
    Dayjs.extend(utc);
    Dayjs.extend(timezone);
    Dayjs.tz.setDefault('Asia/Shanghai');

    startDetectBrowserWalletProvider();
  }, []);
  
  return (
    <SessionProvider session={pageProps.session}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>

          <Component  key={router.asPath} {...pageProps} />

        </QueryClientProvider>
      </WagmiProvider>
    </SessionProvider>
  )
}
