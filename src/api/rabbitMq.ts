import fetch from '@/src/fetch';

export function fetchMqMessages(params: any) {
    return fetch.get('/api/web/rabbitmq/queue', { params });
}