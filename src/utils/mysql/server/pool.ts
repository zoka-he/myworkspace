import mysql from 'mysql2';
import config from '@/src/config/mysql';

const connections = mysql.createPool({
    host: config.MYSQL_HOST,
    database: config.MYSQL_DATABASE,
    port: config.MYSQL_PORT,
    user: config.MYSQL_USER,
    password: config.MYSQL_PASSWORD
})

// 测试数据库是否连接成功
connections.getConnection((err, conn) => {
    if (err) {
        console.log('mysql连接失败');
        console.error(err);
        return;
    }

    conn.connect((err) => {
        if (err) {
            console.log('mysql连接失败');
            console.error(err);
        } else {
            console.log('mysql连接成功');
        }
    })
});

process.on('exit', async (code) => {
    try {
        await connections.end()
    } catch (error) {}
});

export default connections.promise();