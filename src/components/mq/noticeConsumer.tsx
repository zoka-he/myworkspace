import { IMessage } from "@stomp/stompjs";
import { message, notification } from "antd";
import { useMQ } from "../context/aiNovel";
import { useEffect, useRef } from "react";

export default function TestConsumer() {
    const { subscribe, unsubscribe, isConnected } = useMQ();
    const subscriptionIdRef = useRef<string | null>(null);

    useEffect(() => {
        // 只有连接成功后才订阅
        if (!isConnected) {
            return;
        }

        // 避免重复订阅
        if (subscriptionIdRef.current) {
            return;
        }

        // 订阅 fanout 交换机：/exchange/{exchange_name}/{routing_key}
        // 对于 fanout 类型，routing_key 可以为空
        const subId = subscribe({ destination: '/exchange/frontend_notice.fanout' }, (mqMessage: IMessage) => {
            if (mqMessage.body) {
                let body = JSON.parse(mqMessage.body);
                if (body.type === 'embed_task_completed' && body.dataType === 'character') {
                    notification.success({
                        message: '角色向量生成完毕',
                        description: `指纹：${body.fingerprint}`
                    });
                }

                if (body.type === 'embed_task_completed' && body.dataType === 'location') {
                    notification.success({
                        message: '地理向量生成完毕',
                        description: `指纹：${body.fingerprint}`
                    });
                }
            }
            mqMessage.ack();
            // console.log(mqMessage);
        });

        subscriptionIdRef.current = subId;

        // 清理函数：组件卸载时取消订阅
        return () => {
            if (subscriptionIdRef.current) {
                unsubscribe(subscriptionIdRef.current);
                subscriptionIdRef.current = null;
            }
        };
    }, [isConnected, subscribe, unsubscribe]);

    return <></>
}