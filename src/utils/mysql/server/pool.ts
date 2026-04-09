import mysql from 'mysql2/promise';
import config from '@/src/config/mysql';

type MysqlRuntimeConfig = {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    databaseNovel: string;
    connectionLimit?: number;
    timezone?: string;
};

function createPools(cfg: MysqlRuntimeConfig) {
    const common = {
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        connectionLimit: cfg.connectionLimit ?? 30,
        timezone: cfg.timezone || 'Asia/Shanghai',
    };
    const appPool = mysql.createPool({
        ...common,
        database: cfg.database,
    });
    const novelPool = mysql.createPool({
        ...common,
        database: cfg.databaseNovel,
    });
    return { appPool, novelPool };
}

let currentConfig: MysqlRuntimeConfig = {
    host: process.env.MYSQL_HOST || config.MYSQL_HOST,
    database: process.env.MYSQL_DATABASE || config.MYSQL_DATABASE,
    port: Number(process.env.MYSQL_PORT || config.MYSQL_PORT),
    user: process.env.MYSQL_USER || config.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD || config.MYSQL_PASSWORD,
    databaseNovel: process.env.MYSQL_DATABASE_NOVEL || config.MYSQL_DATABASE_NOVEL,
    connectionLimit: 30,
    timezone: 'Asia/Shanghai',
};

const initialPools = createPools(currentConfig);
let connPool = initialPools.appPool;
let novalPool = initialPools.novelPool;


// 防止重复注册退出事件
let registeredExitHandler = false;

function registerExitHandler() {
    if (registeredExitHandler) return;
    registeredExitHandler = true;

    process.on('exit', async () => {
        try {
            await novalPool.end();
            await connPool.end();
        } catch (error) {
            console.error('Error closing pools on exit:', error);
        }
    });

    process.on('SIGINT', () => process.exit());
    process.on('SIGTERM', () => process.exit());
}

registerExitHandler();

async function pingPool(pool: mysql.Pool) {
    const conn = await pool.getConnection();
    await conn.query('select 1');
    conn.release();
}

async function closePoolQuietly(pool: mysql.Pool | null) {
    if (!pool) return;
    try {
        await pool.end();
    } catch (error) {
        console.error('[MySQL] Failed to close pool:', error);
    }
}

async function reconfigureMysqlPools(newConfig: MysqlRuntimeConfig) {
    const nextConfig: MysqlRuntimeConfig = {
        ...currentConfig,
        ...newConfig,
    };

    const next = createPools(nextConfig);
    await pingPool(next.appPool);
    await pingPool(next.novelPool);

    const oldConnPool = connPool;
    const oldNovalPool = novalPool;
    connPool = next.appPool;
    novalPool = next.novelPool;
    currentConfig = nextConfig;

    await Promise.all([
        closePoolQuietly(oldConnPool),
        closePoolQuietly(oldNovalPool),
    ]);
    console.log('[MySQL] Pools reconfigured from runtime config');
}

export { connPool, novalPool, reconfigureMysqlPools, type MysqlRuntimeConfig };