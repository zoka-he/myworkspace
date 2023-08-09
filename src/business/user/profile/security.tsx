import { Button, Card, Form, Input, Table, message } from "antd";
import sm2PubKey from '@/src/utils/cipher/sm2/loginPub.json';
import fetch from '@/src/fetch';
import { useEffect, useState } from "react";
import DayJS from 'dayjs';

const smCrypto = require('sm-crypto');

export default function() {
    let [chpwdForm] = Form.useForm();
    let [ loginLog, setLoginLog ] = useState([]);


    useEffect(() => {
        loadLoginLog();
    }, [])

    async function onFinish(formdata: any) {
        let { oldPwd, newPwd, newPwd2 } = formdata;

        if (newPwd !== newPwd2) {
            message.error('两次输入新密码不一致！请重新输入新密码！');
            return;
        }

        let payload = smCrypto.sm2.doEncrypt(
            JSON.stringify({ oldPwd, newPwd }),
            sm2PubKey
        );

        try {
            await fetch.post('/api/my-account/chpwd', { payload });
            chpwdForm.resetFields();
            message.info('更改密码成功！');
        } catch(e) {
            message.error('更改密码失败');
        }
    }

    async function loadLoginLog() {
        let { data } = await fetch.get('/api/my-account/loginlog');
        setLoginLog(data);
    }

    function renderDatetime(cell: string) {
        // 东8区
        return DayJS(cell).add(0, 'hour').format('YYYY-MM-DD HH:mm:ss');
    }

    return (
        <div>
            <Card title="修改密码" size="small" style={{ width: 450 }}>
                <Form form={chpwdForm}
                    labelCol={{ span: 5 }}
                    wrapperCol={{ span: 17 }}
                    onFinish={onFinish}
                >
                    <Form.Item label="旧密码" name="oldPwd">
                        <Input.Password/>
                    </Form.Item>
                    <Form.Item label="新密码" name="newPwd">
                        <Input.Password/>
                    </Form.Item>
                    <Form.Item label="再输一次" name="newPwd2">
                        <Input.Password/>
                    </Form.Item>
                    <Form.Item wrapperCol={{ offset: 5 }}>
                        <Button type="primary" htmlType="submit" style={{ width: 160 }}>提交</Button>
                    </Form.Item>
                </Form>
            </Card>
            <br />
            <Card title="访问记录" size="small" style={{ width: 450 }}>
                <Table size="small" dataSource={loginLog}>
                    <Table.Column title="账号" dataIndex="username"></Table.Column>
                    <Table.Column title="用户名" dataIndex="nickname"></Table.Column>
                    <Table.Column title="日期" dataIndex="login_time" render={renderDatetime}></Table.Column>
                    {/* <Table.Column title="IP地址"></Table.Column> */}
                </Table>
            </Card>
        </div>
    )
}