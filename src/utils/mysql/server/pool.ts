import mysql from 'mysql2/promise';
import config from '@/src/config/mysql';

const connPool = mysql.createPool({
    host: config.MYSQL_HOST,
    database: config.MYSQL_DATABASE,
    port: config.MYSQL_PORT,
    user: config.MYSQL_USER,
    password: config.MYSQL_PASSWORD
});

const novelPool = mysql.createPool({
    host: config.MYSQL_HOST,
    database: config.MYSQL_DATABASE_NOVEL,
    port: config.MYSQL_PORT,
    user: config.MYSQL_USER,
    password: config.MYSQL_PASSWORD
});


// 防止重复注册退出事件
let registeredExitHandler = false;

function registerExitHandler() {
    if (registeredExitHandler) return;
    registeredExitHandler = true;

    process.on('exit', async () => {
        try {
            await novelPool.end();
            await connPool.end();
        } catch (error) {
            console.error('Error closing pools on exit:', error);
        }
    });

    process.on('SIGINT', () => process.exit());
    process.on('SIGTERM', () => process.exit());
}

registerExitHandler();

export { connPool, novelPool };