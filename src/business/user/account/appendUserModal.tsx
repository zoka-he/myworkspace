import { Button, Form, Input, Modal, Radio, Select, TreeSelect, message } from "antd";
import { useEffect, useRef, useState } from "react";
import fetch from '@/src/fetch';
import useModalHelper, { IModalHelper } from "@/src/utils/common/modalHelper";

function db2form(data: any) {
    let form = {...data};
    if (form.roles === null) {
        form.roles = [];
    }
    return form;
}

interface IAppendUserModalProps {
    helper?: IModalHelper,
    onFinish?: Function
}

function AppendUserModal(props: IAppendUserModalProps) {

    let helper = props.helper || useModalHelper();
    let [formHelper] = Form.useForm();
    let [roleOptions, setRoleOption] = useState([]);

    useEffect(() => {
        if (helper.open) {
            let payload = helper.getPayload();
            
            formHelper.setFieldsValue(db2form(payload));
            loadRoleOption();
        }
    }, [helper.open]);

    function onClose() {
        helper.close();
        formHelper.resetFields();
    }

    async function loadRoleOption() {
        let { data } = await fetch.get('/api/user/role/list', { params: { page: 1, limit: 100 } });
        setRoleOption(data.map((item: any) => {
            return {
                value: item.ID,
                label: item.rolename
            }
        }))
    }

    async function onFinish(formData: any) {
        let postData = {
            ...formData,
        };

        try {
            let payload = helper.getPayload();
            let ID = payload?.ID;

            if (typeof ID === 'number') {
                await fetch.post('/api/user/account', postData, { params: { ID } });
                message.success('更新用户: ' + postData.username);
            } else {
                await fetch.post('/api/user/account', postData);
                message.success('创建用户: ' + postData.username);
            }

            onClose();

            if (typeof props.onFinish === 'function') {
                props.onFinish();
            }
        
        } catch(e: any) {
            console.error(e);
            message.error(e.message);
        }
    }

    let title = '添加用户';

    return (
        <Modal title={title} open={helper.open} footer={null} onCancel={onClose}>
            <Form form={formHelper} onFinish={onFinish}>
                <Form.Item label="账号" name="username">
                    <Input/>
                </Form.Item>
                <Form.Item label="昵称" name="nickname">
                    <Input/>
                </Form.Item>
                <Form.Item label="密码" name="password">
                    <Input/>
                </Form.Item>
                <Form.Item label="角色" name="roles">
                    <Select mode="multiple" options={roleOptions}></Select>
                </Form.Item>
                <Form.Item label="主页">
                    <TreeSelect></TreeSelect>
                </Form.Item>
                <Form.Item label="类型" name="type">
                    <Select>
                        <Select.Option value="">普通</Select.Option>
                        <Select.Option value="admin">管理员</Select.Option>
                    </Select>
                </Form.Item>

                <div className="f-align-center">
                    <Button htmlType="submit" type="primary" style={{ width: 200 }}>提交</Button>
                </div>
            </Form>
        </Modal>
    )
}

AppendUserModal.useModalHelper = useModalHelper;

export default AppendUserModal;