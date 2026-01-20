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

async function startRabbitMQConsumer() {
    try {
        // 动态导入以避免客户端打包问题
        const { initializeHandlers } = await import('./src/server/rabbitmq/handlers');
        const { closeRabbitMQConsumer } = await import('./src/server/rabbitmq/consumer');
        
        console.log('[Instrumentation] Starting RabbitMQ consumer...');
        await initializeHandlers();
        console.log('[Instrumentation] RabbitMQ consumer started successfully');
        
        // 优雅关闭
        const shutdown = async () => {
            console.log('[Instrumentation] Shutting down RabbitMQ consumer...');
            await closeRabbitMQConsumer();
            process.exit(0);
        };
        
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
        
    } catch (error) {
        console.error('[Instrumentation] Failed to start RabbitMQ consumer:', error);
        // 不抛出错误，允许应用继续运行
    }
}
