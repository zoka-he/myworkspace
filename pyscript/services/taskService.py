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
            count(if(status=5, 1, null)) closed, \
            sys_name, employee \
        from t_task group by sys_name, employee"
    )

    # 使用 fetchone() 方法获取单条数据.
    data = cursor.fetchall()

    s_nowdate = time.nowDate('%Y%m%d')

    #删除当天统计
    cursor.execute(
        "delete from t_task_state_count where datestr=%s",
        (s_nowdate,)
    )

    # 添加当天统计
    for row in data:

        ins_row = (
            s_nowdate,
            row[0],
            row[1],
            row[2],
            row[3],
            row[4],
            row[5],
            row[6],
            row[7],
            row[8] or "", # sys_name
            row[9] or "" # employee
        )
        print ("taskCount: ", ins_row)

        cursor.execute(
            "insert into t_task_state_count(\
                datestr, total, unfinished, not_started, developing, testing, fuckable, finished, closed, sys_name, employee\
            ) values (\
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s\
            )",
            ins_row
        )

    conn.commit()

    return data