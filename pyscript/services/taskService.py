from utils import time

def countTaskState(conn):
    # 使用 cursor() 方法创建一个游标对象 cursor
    cursor = conn.cursor()

    # 使用 execute()  方法执行 SQL 查询 
    cursor.execute(
        "select \
            count(0) total, \
            count(if(status<4, 1, null)) unfinished, \
            count(if(status=0, 1, null)) not_started, \
            count(if(status=1, 1, null)) developing, \
            count(if(status=2, 1, null)) testing, \
            count(if(status=3, 1, null)) fuckable, \
            count(if(status=4, 1, null)) finished, \
            count(if(status=5, 1, null)) closed \
        from t_task;"
    )

    # 使用 fetchone() 方法获取单条数据.
    data = cursor.fetchone()

    s_nowdate = time.nowDate('%Y%m%d')

    # 删除当天统计
    cursor.execute(
        "delete from t_task_state_count where datestr=%s",
        (s_nowdate,)
    )

    # 添加当天统计
    data = (s_nowdate,) + data
    print ("taskCount: ", data)

    cursor.execute(
        "insert into t_task_state_count(\
            datestr, total, unfinished, not_started, developing, testing, fuckable, finished, closed\
        ) values (\
            %s, %s, %s, %s, %s, %s, %s, %s, %s\
        )",
        data
    )

    conn.commit()

    return data