from db import mysql
from services import taskService

# 本脚本每小时执行一次，按天统计的任务也放在这里，避免笔记本随时休眠导致错过任务时间

conn = mysql.getConn()

# 执行统计当天任务状态的任务
taskService.countTaskState(conn)

conn.close()