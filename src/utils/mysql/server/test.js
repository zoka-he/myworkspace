const mysqlUtil = require('./index');

async function testTrans() {

    // 开启事务
    // await conn.beginTransaction();
    try {

        // 必然正确的命令
        let rows = await mysqlUtil.selectBySql(`select * from t_task`);
        console.log(rows, rows.length);

        // 必然出错的命令
        // await conn.execute('update pedm_auth_admin set updated_at=?,login_count=login_count+error where user_name=?', [new Date().getTime() / 1000, userName]);

        // 提交事务
        // await conn.commit();
        // console.log('事务成功提交');
    } catch (error) {
        // 回滚事务
        // conn.rollback();
        // console.log('事务回滚', error.sqlMessage, error);

    }
    // // 释放连接
    // conn.release();
}

testTrans().then(() => {
    process.exit(0);
});
