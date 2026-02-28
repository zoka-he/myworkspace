import { NextResponse } from 'next/server';
import MyAccountService from '@/src/services/user/myAccountService';
import getLocalIps from '@/src/business/aiNoval/common/getLocalIps';

const myAccountService = new MyAccountService();

export async function GET() {
  try {
    const accountData = await myAccountService.getMainPageInitData(null);
    const ipData = getLocalIps.getPreferredIP();
    return NextResponse.json({
      ...accountData,
      serverIp: ipData,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '服务器错误';
    return NextResponse.json({ message }, { status: 500 });
  }
}
