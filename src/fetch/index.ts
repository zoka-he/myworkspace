import { message } from '@/src/utils/antdAppMessage';
import axios from 'axios';
import { notifyAiNovelWriteCompleted, type ManagePageSource } from '@/src/business/aiNoval/sharedWorkerBridge';

function isMutatingMethod(method?: string) {
    if (!method) return false;
    const value = method.toLowerCase();
    return value === 'post' || value === 'put' || value === 'patch' || value === 'delete';
}

function detectSourceByPathname(pathname: string): ManagePageSource | null {
    if (pathname.startsWith('/novel/geographyManage')) return 'geography';
    if (pathname.startsWith('/novel/factionManage')) return 'faction';
    if (pathname.startsWith('/novel/roleManage')) return 'role';
    if (pathname.startsWith('/novel/eventManage2')) return 'event';
    return null;
}

function isTrackedWriteApi(url?: string) {
    if (!url) return false;
    return (
        url.includes('/api/aiNoval/geo/') ||
        url.includes('/api/aiNoval/faction') ||
        url.includes('/api/aiNoval/role') ||
        url.includes('/api/aiNoval/timelineEvent') ||
        url.includes('/api/web/aiNoval/timelineEvent')
    );
}

function reportAiNovelWriteIfNeeded(response: any) {
    if (typeof window === 'undefined') return;
    const config = response?.config;
    if (!config || !isMutatingMethod(config.method) || !isTrackedWriteApi(config.url)) return;
    const source = detectSourceByPathname(window.location.pathname);
    if (!source) return;
    notifyAiNovelWriteCompleted({
        source,
        action: String(config.method).toUpperCase(),
        api: config.url,
    });
}
const service = axios.create({
    timeout: 30 * 1000
});

service.interceptors.request.use(
    config => {
        return config
    },
    error => {
        message.error(error.message);
        return Promise.reject(error);
    }
);

service.interceptors.response.use(function (response) {
    reportAiNovelWriteIfNeeded(response);
    return response.data;
}, function (error) {
    message.error(error.message);
    return Promise.reject(error);
});

export default service;