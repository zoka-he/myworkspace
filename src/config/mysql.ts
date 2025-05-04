const cfg = {
    MYSQL_HOST: 'localhost',
    MYSQL_DATABASE: 'task_manage',
    MYSQL_PORT: 3306,
    MYSQL_USER: 'myworksite',
    MYSQL_PASSWORD: 'nsds123456'
}

console.info('node env: ', process.env.NODE_ENV);
if (process.env.NODE_ENV === 'production') {
    cfg.MYSQL_HOST = 'host.docker.internal';
}

export default cfg;