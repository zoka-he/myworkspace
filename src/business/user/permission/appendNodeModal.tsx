import { Button, Form, Input, Modal, Radio, TreeSelect, message } from "antd";
import { useEffect, useRef, useState } from "react";
import fetch from '@/src/fetch';
import { IPermission } from "./IPermission";
import getPermissionTree from "./getPermissionTree";
import useModalHelper, { IModalHelper } from "@/src/utils/common/modalHelper";


interface IAppendNodeModalProps {
    helper?: IModalHelper,
    onFinish?: Function
}

function AppendNodeModal(props: IAppendNodeModalProps) {

    let helper = props.helper || useModalHelper();
    let [formHelper] = Form.useForm();
    let [perms, setPerms] = useState<IPermission[]>([]);
    let permsMap = useRef<Map<number, IPermission>>();
    let formUri = Form.useWatch('uri', formHelper);
    let formPID = Form.useWatch('PID', formHelper);

    useEffect(() => {
        if (helper.open) {
            let payload = helper.getPayload();
            formHelper.setFieldsValue(payload);
            getPermissionTree.fromRemote().then(({ tree, map }) => {
                setPerms(tree)
                permsMap.current = map;
            });
        }
    }, [helper.open]);

    function onClose() {
        helper.close();
        formHelper.resetFields();
    }

    function getUrlPrefix(_pid: number) {
        let pMap = permsMap.current;
        if (!pMap) {
            return '';
        }

        let uris: string[] = [];
        while (_pid) {
            let node = pMap.get(_pid);
            if (!node) {
                break;
            }

            if (node.uri) {
                uris.unshift(node.uri);
            }
            
            if (typeof node.PID !== 'number') {
                break;
            }
            
            _pid = node.PID;
        }

        return uris.join('');
    }

    function uri2url() {
        let prefix = getUrlPrefix(formPID);
        return prefix + (formUri || '');
    }

    async function onFinish(formData: any) {
        let postData = {
            ...formData,
            url: uri2url()
        };

        try {
            let payload = helper.getPayload();
            let ID = payload?.ID;

            if (typeof ID === 'number') {
                await fetch.post('/api/user/permission', postData, { params: { ID } });
                message.success('更新节点: ' + postData.label);
            } else {
                await fetch.post('/api/user/permission', postData);
                message.success('创建节点: ' + postData.label);
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

    let title = '添加节点';

    return (
        <Modal title={title} open={helper.open} footer={null} onCancel={onClose}>
            <Form form={formHelper} onFinish={onFinish}>
                <Form.Item label="父节点" name="PID">
                    <TreeSelect 
                        allowClear 
                        treeDefaultExpandAll 
                        treeData={perms}
                        fieldNames={{ label: 'label', value: 'ID', children: 'children' }}
                    />
                </Form.Item>
                <Form.Item label="标题" name="label">
                    <Input/>
                </Form.Item>
                <Form.Item label="类型" name='type'>
                    <Radio.Group>
                        <Radio value={'menu'}>菜单</Radio>
                        <Radio value={'api'}>API</Radio>
                        <Radio value={'obj'}>控件</Radio>
                    </Radio.Group>
                </Form.Item>
                <Form.Item label="URI" name="uri">
                    <Input/>
                </Form.Item>
                <Form.Item label="URL" name="url">
                    {uri2url()}
                </Form.Item>

                <div className="f-align-center">
                    <Button htmlType="submit" type="primary" style={{ width: 200 }}>提交</Button>
                </div>
            </Form>
        </Modal>
    )
}

AppendNodeModal.useModalHelper = useModalHelper;

export default AppendNodeModal;