// import '@/styles/globals.css'
import '@/styles/common.scss';
import '@/styles/colors.scss';
import '@/styles/antd-fix.scss';
import 'antd/dist/reset.css';

import '@/styles/myapp.scss';


import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { SessionProvider, useSession } from 'next-auth/react';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  return (
    <SessionProvider session={pageProps.session}>
        <Component  key={router.asPath} {...pageProps} />
    </SessionProvider>
  )
}
