const cfg = {
    MYSQL_HOST: 'localhost',
    // MYSQL_HOST: '192.168.3.194',
    // MYSQL_HOST: '192.168.0.175',
    MYSQL_DATABASE: 'task_manage',
    MYSQL_PORT: 3306,
    MYSQL_USER: 'myworksite',
    MYSQL_PASSWORD: 'nsds123456',
    MYSQL_DATABASE_NOVEL: 'dify_novel'
}

console.info('node env: ', process.env.NODE_ENV);
if (process.env.NODE_ENV === 'production') {
    cfg.MYSQL_HOST = 'host.docker.internal';
}

export default cfg;