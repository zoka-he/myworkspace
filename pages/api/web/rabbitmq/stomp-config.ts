import type { NextApiRequest, NextApiResponse } from 'next';

type StompConfigResponse = {
  success: boolean;
  data?: {
    frontendUrl: string;
    backendUrl: string;
    host: string;
    port: string;
    managementUrl: string;
    login: string;
    passcode: string;
    vhost: string;
  };
  error?: string;
};

function resolveManagementUrl() {
  if (process.env.RABBITMQ_MANAGEMENT_URL) {
    return process.env.RABBITMQ_MANAGEMENT_URL;
  }
  const host = process.env.RABBITMQ_STOMP_HOST || 'localhost';
  return `http://${host}:28008`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StompConfigResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res.status(200).json({
      success: true,
      data: {
        frontendUrl: process.env.RABBITMQ_STOMP_FRONTEND_URL || '',
        backendUrl: process.env.RABBITMQ_STOMP_BACKEND_URL || '',
        host: process.env.RABBITMQ_STOMP_HOST || '',
        port: process.env.RABBITMQ_STOMP_PORT || '28010',
        managementUrl: resolveManagementUrl(),
        login: process.env.RABBITMQ_STOMP_USER || '',
        passcode: process.env.RABBITMQ_STOMP_PASSWD || '',
        vhost: process.env.RABBITMQ_STOMP_VHOST || '/',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'failed to read stomp config',
    });
  }
}
