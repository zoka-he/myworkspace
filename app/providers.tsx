'use client';

import { useEffect, type ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import Dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { startDetectBrowserWalletProvider } from '@/src/utils/ethereum';

function initDayjs() {
  Dayjs.extend(utc);
  Dayjs.extend(timezone);
  Dayjs.tz.setDefault('Asia/Shanghai');
}

export function ClientProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    initDayjs();
    startDetectBrowserWalletProvider();
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
