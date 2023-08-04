import '@/src/init';
import Head from 'next/head'
import { Form, Button, Checkbox, Input, Space, Descriptions } from 'antd';
import { getCsrfToken } from 'next-auth/react';
import sm2PubKey from '@/src/utils/cipher/sm2/loginPub.json';
import { useSession, signIn, signOut } from 'next-auth/react';
import DayJS from 'dayjs';

const smCrypto = require('sm-crypto');

type FieldType = {
    username?: string;
    password?: string;
    remember?: string;
};

interface ILoginProps {
    csrfToken?: string
}

export default function Login(props: ILoginProps) {

    const session = useSession();
    const [loginForm] = Form.useForm();

    const onFinish = async (formData: any) => {
        let payload = smCrypto.sm2.doEncrypt(JSON.stringify({
            username: formData.username || '',
            password: formData.password || ''
        }), sm2PubKey);

        let postData = {
            payload,
            csrfToken: props.csrfToken
        }

        console.log('login:', formData);
        try {
            let url = '/api/auth/callback/credentials';

            let tempForm = document.createElement("form");
            tempForm.id = "tempForm1";
            tempForm.method = "post";
            tempForm.action = url;

            

            for (let [k, v] of Object.entries(postData)) {
                let hideInput = document.createElement("input");
                hideInput.type = "hidden";
                hideInput.name = k;
                hideInput.value = v;
                tempForm.appendChild(hideInput);
            }


            if (document.all) {    // 兼容不同浏览器
                tempForm.attachEvent("onsubmit", function () { });        //IE
            } else {
                tempForm.addEventListener("submit", function () { }, false);    //firefox
            }
            document.body.appendChild(tempForm);
            if (document.all) {    // 兼容不同浏览器
                tempForm.fireEvent("onsubmit");
            } else {
                tempForm.dispatchEvent(new Event("submit"));
            }
            tempForm.submit();
            document.body.removeChild(tempForm);

        } catch (e: any) {

        }
    };

    const onFinishFailed = (errorInfo: any) => {
        console.log('Failed:', errorInfo);
    };

    const toMainPage = (e: MouseEvent) => {
        e.preventDefault();
        window.location.href = '/';
    }


    let isLogin = session.status === 'authenticated';

    let renderLoginForm = null;
    if (isLogin) {
        renderLoginForm = (
            <div style={{ marginLeft: 130 }}>
                <Descriptions title="用户信息" column={1}>
                    <Descriptions.Item label="Username">
                        { session.data?.user?.name }
                    </Descriptions.Item>

                    <Descriptions.Item label="Expire">
                        { DayJS(session.data?.expires).format('YYYY-MM-DD HH:mm:ss') }
                    </Descriptions.Item>

                </Descriptions>

                <Space size={20}>
                    <Button type="primary" style={{ width: 140 }} onClick={toMainPage}>
                        前往主页
                    </Button>
                    <Button type="primary" style={{ width: 140 }} danger onClick={toMainPage}>
                        登出
                    </Button>
                </Space>
            </div>
        )
    } else {
        renderLoginForm = (
            <Form
                name="basic"
                form={loginForm}
                labelCol={{ span: 8 }}
                wrapperCol={{ span: 16 }}
                style={{ maxWidth: 600 }}
                initialValues={{ remember: true }}
                onFinish={onFinish}
                onFinishFailed={onFinishFailed}
                autoComplete="off"
            >
                <Form.Item<FieldType>
                    label="Username"
                    name="username"
                    rules={[{ required: true, message: 'Please input your username!' }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item<FieldType>
                    label="Password"
                    name="password"
                    rules={[{ required: true, message: 'Please input your password!' }]}
                >
                    <Input.Password />
                </Form.Item>

                <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
                    <Space size={20}>
                        <Button type="primary" htmlType="submit" style={{ width: 200 }}>
                            Submit
                        </Button>

                        <Form.Item name='isNewUser' noStyle>
                            <Checkbox>新用户注册</Checkbox>
                        </Form.Item>
                    </Space>
                </Form.Item>


            </Form>
        )
    }

    return (
        <>
            <Head>
                <title>my workspace</title>
                <meta name="description" content="Generated by create next app" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className="f-full-screen" style={{ background: '#15517a' }}>
                <div style={{
                    background: '#ffffffc0',
                    padding: '50px 10vw',
                    marginTop: 'calc(50vh - 180px)'
                }}>
                    { renderLoginForm }
                </div>
            </main>

        </>
    )
}


//获取初始化csrfToken
export async function getServerSideProps(context: any) {
    return {
        props: {
            csrfToken: await getCsrfToken(context),
        },
    }
}
