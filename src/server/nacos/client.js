const { NacosConfigClient, NacosNamingClient } = require('nacos');

let configClient = null;
let namingClient = null;
let isReady = false;

function boolEnv(name, defaultValue = false) {
    const value = process.env[name];
    if (value == null) return defaultValue;
    return value === 'true';
}

function parsePort(name, defaultValue) {
    const raw = process.env[name];
    const parsed = Number.parseInt(raw || String(defaultValue), 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
}

function getServerAddr() {
    return process.env.NACOS_SERVER_ADDR || process.env.NACOS_SERVER_LIST || '127.0.0.1:8848';
}

async function initNacosClient() {
    if (isReady) return { configClient, namingClient };

    const serverAddr = getServerAddr();
    const namespace = process.env.NACOS_NAMESPACE || 'public';
    const username = process.env.NACOS_USERNAME;
    const password = process.env.NACOS_PASSWORD;

    configClient = new NacosConfigClient({
        serverAddr,
        namespace,
        username,
        password,
    });

    await configClient.ready();

    const enableNaming = boolEnv('NACOS_ENABLE_NAMING', false);
    if (enableNaming) {
        namingClient = new NacosNamingClient({
            serverList: serverAddr,
            namespace,
            ssl: boolEnv('NACOS_SSL', false),
            username,
            password,
        });

        await namingClient.ready();

        if (boolEnv('NACOS_NAMING_AUTO_REGISTER', false)) {
            const serviceName = process.env.NACOS_SERVICE_NAME;
            if (!serviceName) {
                throw new Error('NACOS_SERVICE_NAME is required when NACOS_NAMING_AUTO_REGISTER=true');
            }

            await namingClient.registerInstance(serviceName, {
                ip: process.env.NACOS_SERVICE_IP || '127.0.0.1',
                port: parsePort('NACOS_SERVICE_PORT', 3000),
                ephemeral: boolEnv('NACOS_SERVICE_EPHEMERAL', true),
                enabled: boolEnv('NACOS_SERVICE_ENABLED', true),
                weight: Number(process.env.NACOS_SERVICE_WEIGHT || '1'),
                metadata: process.env.NACOS_SERVICE_METADATA
                    ? JSON.parse(process.env.NACOS_SERVICE_METADATA)
                    : undefined,
            });
        }
    }

    isReady = true;
    console.log('[Nacos] Client initialized successfully');
    return { configClient, namingClient };
}

function getNacosConfigClient() {
    return configClient;
}

function getNacosNamingClient() {
    return namingClient;
}

async function closeNacosClient() {
    if (namingClient) {
        await namingClient.close();
        namingClient = null;
    }
    if (configClient) {
        await configClient.close();
        configClient = null;
    }
    isReady = false;
}

module.exports = {
    initNacosClient,
    closeNacosClient,
    getNacosConfigClient,
    getNacosNamingClient,
};
