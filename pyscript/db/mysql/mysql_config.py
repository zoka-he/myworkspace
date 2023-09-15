import os

mysql_config_dev = {
    'MYSQL_HOST': '192.168.2.175',
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

env_name = os.getenv('env')
mysql_config = mysql_config_dev

if (env_name == 'prod' or env_name == 'production'):
    mysql_config = mysql_config_prod