/**
 * Next.js Instrumentation (Root level)
 * 
 * 此文件在 Next.js 服务器启动时执行
 * 用于初始化服务器端的后台服务，如 RabbitMQ 消费者
 * 
 * 参考: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
    // 只在服务器端 Node.js 运行时执行
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        console.log('[Instrumentation] Initializing server-side services...');
        await startNacosClient();
        
        // 检查是否启用 RabbitMQ 消费者
        const enableRabbitMQ = process.env.RABBITMQ_ENABLE_SERVER_CONSUMER === 'true';
        
        if (enableRabbitMQ) {
            await startRabbitMQConsumer();
        } else {
            console.log('[Instrumentation] RabbitMQ server consumer is disabled');
            console.log('[Instrumentation] Set RABBITMQ_ENABLE_SERVER_CONSUMER=true to enable');
        }
    }
}

async function startNacosClient() {
    const enableNacos = process.env.NACOS_ENABLE_CLIENT === 'true';
    if (!enableNacos) {
        console.log('[Instrumentation] Nacos client is disabled');
        console.log('[Instrumentation] Set NACOS_ENABLE_CLIENT=true to enable');
        return;
    }

    try {
        const { initNacosClient, closeNacosClient } = await import('./src/server/nacos/client');
        console.log('[Instrumentation] Starting Nacos client...');
        await initNacosClient();
        // 注意：instrumentation 文件会被 Edge 规则静态检查，避免在此直接使用 process.on。
        // 如需优雅退出，可在纯 Node.js 入口（例如独立 server 启动文件）中调用 closeNacosClient。
    } catch (error) {
        console.error('[Instrumentation] Failed to start Nacos client:', error);
        // 不抛出错误，允许应用继续运行
    }
}

async function startRabbitMQConsumer() {
    try {
        // 动态导入以避免客户端打包问题
        const { initializeHandlers } = await import('./src/server/rabbitmq/handlers');
        const { closeRabbitMQConsumer } = await import('./src/server/rabbitmq/consumer');
        
        console.log('[Instrumentation] Starting RabbitMQ consumer...');
        await initializeHandlers();
        console.log('[Instrumentation] RabbitMQ consumer started successfully');
        void closeRabbitMQConsumer;
        
    } catch (error) {
        console.error('[Instrumentation] Failed to start RabbitMQ consumer:', error);
        // 不抛出错误，允许应用继续运行
    }
}


