import mysql from 'mysql2/promise';
import config from '@/src/config/mysql';

const connPool = mysql.createPool({
    host: config.MYSQL_HOST,
    database: config.MYSQL_DATABASE,
    port: config.MYSQL_PORT,
    user: config.MYSQL_USER,
    password: config.MYSQL_PASSWORD
});


process.on('exit', async (code) => {
    try {
        await connPool.end()
    } catch (error) {}
});


export default connPool;