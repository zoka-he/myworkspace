import os

mysql_config_dev = {
    # 'MYSQL_HOST': 'localhost',
    'MYSQL_HOST': '192.168.1.194',
    'MYSQL_DATABASE': 'task_manage',
    'MYSQL_PORT': 3306,
    'MYSQL_USER': 'root',
    'MYSQL_PASSWORD': 'nsds123456'
}

mysql_config_prod = {
    'MYSQL_HOST': 'mysql',
    'MYSQL_DATABASE': 'task_manage',
    'MYSQL_PORT': 3306,
    'MYSQL_USER': 'root',
    'MYSQL_PASSWORD': 'nsds123456'
}

mysql_config = mysql_config_dev

env_name = os.getenv('PY_ENV')
if (env_name == 'prod' or env_name == 'production'):
    mysql_config = mysql_config_prod