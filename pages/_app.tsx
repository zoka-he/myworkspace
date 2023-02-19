// import '@/styles/globals.css'
import '@/styles/common.scss';
import '@/styles/colors.scss';
import '@/styles/antd-fix.scss';
import 'antd/dist/reset.css';

import '@/styles/dashboard/dashboard.scss';
import '@/styles/dashboard/taskTip.scss';
import '@/styles/task-manage/week-report.scss';


import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  return <Component  key={router.asPath} {...pageProps} />
}
