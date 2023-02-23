// import '@/styles/globals.css'
import '@/styles/common.scss';
import '@/styles/colors.scss';
import '@/styles/antd-fix.scss';
import 'antd/dist/reset.css';

import '@/styles/myapp.scss';


import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  return <Component  key={router.asPath} {...pageProps} />
}
