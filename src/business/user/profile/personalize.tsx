import { Button, Card, Form, TreeSelect } from "antd";

export default function() {
    let [ chHomeForm ] = Form.useForm();

    function onFinish(formData: any) {

    }

    return (
        <div>
            <Card title="修改主页" size="small" style={{ width: 450 }}>
                <Form form={chHomeForm}
                    labelCol={{ span: 5 }}
                    wrapperCol={{ span: 17 }}
                    onFinish={onFinish}
                >
                    <Form.Item label="主页" name="oldPwd">
                        <TreeSelect/>
                    </Form.Item>
                    <Form.Item wrapperCol={{ offset: 5 }}>
                        <Button type="primary" htmlType="submit" style={{ width: 160 }}>提交</Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    )
}