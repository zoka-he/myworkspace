import { createContext } from "react";
import { RabbitMQConfig, SubscriptionConfig, defaultRabbitMQConfig } from "@/src/config/rabbitmq";

/** Config context */
export const MQConfigContext = createContext<RabbitMQConfig>(defaultRabbitMQConfig);

export { defaultRabbitMQConfig, type RabbitMQConfig, type SubscriptionConfig };
