import pymysql

# 打开数据库连接
db = pymysql.connect(host="localhost", user="root", password="nsds123456", db="task_manage")

# 使用cursor()方法获取操作游标
cursor = db.cursor()

# 执行SQL语句
cursor.execute("SELECT VERSION()")

# 获取一条数据
data = cursor.fetchone()

# 打印结果
print("Database version : %s" % data)

# 关闭游标连接和数据库连接
cursor.close()
db.close()