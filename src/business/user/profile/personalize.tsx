import { IRootState } from "@/src/store";
import { Button, Card, Form, TreeSelect, message } from "antd";
import { connect } from 'react-redux';
import fetch from '@/src/fetch';
import { useEffect } from "react";

const mapStateToProps = (state: IRootState) => {
    return {
        navMenu: state.navigatorSlice.navMenu,
        loginUser: state.loginSlice.user
    }
}

interface IPersonalizeProps {
    navMenu: any[],
    loginUser: any
}

function Personalize(props: IPersonalizeProps) {
    let [ chHomeForm ] = Form.useForm();

    /**
     * 初始化
     */
    useEffect(() => {
        onLoad();
    }, []);

    function onLoad() {
        chHomeForm.setFieldValue('main_url', props.loginUser.main_url);
    }

    async function onFinish(formData: any) {
        console.debug(formData);

        if (!formData.main_url) {
            message.error('请选择主页再提交！');
            return;
        }

        try {
            await fetch.post('/api/my-account/chmainpage', formData);
            message.info('更改成功，下一次登录将自动跳转！');
        } catch(e: any) {
            message.error('更改失败，' + e.message + '！');
        }
    }

    return (
        <div>
            <Card title="修改主页" size="small" style={{ width: 450 }}>
                <Form form={chHomeForm}
                    labelCol={{ span: 5 }}
                    wrapperCol={{ span: 17 }}
                    onFinish={onFinish}
                >
                    <Form.Item label="主页" name="main_url">
                        <TreeSelect
                            treeData={props.navMenu}
                            fieldNames={{ label: 'label', value: 'url', children: 'children' }}
                        />
                    </Form.Item>
                    <Form.Item wrapperCol={{ offset: 5 }}>
                        <Button type="primary" htmlType="submit" style={{ width: 160 }}>提交</Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    )
}

export default connect(mapStateToProps)(Personalize);