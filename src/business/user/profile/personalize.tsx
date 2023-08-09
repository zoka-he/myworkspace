import { IRootState } from "@/src/store";
import { Button, Card, Form, TreeSelect } from "antd";
import { connect } from 'react-redux';

const mapStateToProps = (state: IRootState) => {
    return {
        navMenu: state.navigatorSlice.navMenu,
    }
}

interface IPersonalizeProps {
    navMenu: any[]
}

function Personalize(props: IPersonalizeProps) {
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
                        <TreeSelect
                            treeData={props.navMenu}
                            fieldNames={{ label: 'label', value: 'ID', children: 'children' }}
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