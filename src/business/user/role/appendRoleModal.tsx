import { Button, Form, Input, Modal, Radio, TreeSelect, message } from "antd";
import { useEffect, useRef, useState } from "react";
import fetch from '@/src/fetch';
import useModalHelper, { IModalHelper } from "@/src/utils/common/modalHelper";


interface IAppendRoleModalProps {
    helper?: IModalHelper,
    onFinish?: Function
}

function AppendRoleModal(props: IAppendRoleModalProps) {

    let helper = props.helper || useModalHelper();
    let [formHelper] = Form.useForm();

    useEffect(() => {
        if (helper.open) {
            let payload = helper.getPayload();
            formHelper.setFieldsValue(payload);
        }
    }, [helper.open]);

    function onClose() {
        helper.close();
        formHelper.resetFields();
    }

    

    async function onFinish(formData: any) {
        let postData = {
            ...formData,
        };

        try {
            let payload = helper.getPayload();
            let ID = payload?.ID;

            if (typeof ID === 'number') {
                await fetch.post('/api/user/role', postData, { params: { ID } });
                message.success('更新角色: ' + postData.label);
            } else {
                await fetch.post('/api/user/role', postData);
                message.success('创建角色: ' + postData.label);
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

    let title = '添加角色';

    return (
        <Modal title={title} open={helper.open} footer={null} onCancel={onClose}>
            <Form form={formHelper} onFinish={onFinish}>
                <Form.Item label="名称" name="rolename">
                    <Input/>
                </Form.Item>

                <div className="f-align-center">
                    <Button htmlType="submit" type="primary" style={{ width: 200 }}>提交</Button>
                </div>
            </Form>
        </Modal>
    )
}

AppendRoleModal.useModalHelper = useModalHelper;

export default AppendRoleModal;