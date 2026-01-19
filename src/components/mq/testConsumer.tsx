import { IMessage } from "@stomp/stompjs";
import { message } from "antd";
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

        const subId = subscribe({ destination: '/queue/test' }, (mqMessage: IMessage) => {
            message.success(mqMessage.body);
            mqMessage.ack();
            console.log(mqMessage);
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