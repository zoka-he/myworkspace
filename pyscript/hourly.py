from db import mysql
from services import taskService

conn = mysql.getConn()

taskService.countTaskState(conn)

# 关闭数据库连接
conn.close()