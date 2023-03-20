const cfg = {
    // MYSQL_HOST: '192.168.2.175',
    MYSQL_HOST: 'mysql',
    MYSQL_DATABASE: 'task_manage',
    MYSQL_PORT: 3306,
    MYSQL_USER: 'root',
    MYSQL_PASSWORD: 'nsds123456'
}

console.info('node env: ', process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
    cfg.MYSQL_HOST === 'localhost'
}

export default cfg;