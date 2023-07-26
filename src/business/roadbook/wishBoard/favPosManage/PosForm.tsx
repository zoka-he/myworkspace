import { Button, Card, Checkbox, Col, Form, Input, Row, Select, Space, Switch } from "antd";
import { CloseOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { CSSProperties, useState } from "react";

interface IPosFormProps {
    form?: IPosFormHelper,
    height?: string | number
}

interface IPosFormHelper {
    open: boolean
    show: Function;
    hide: Function;
}

function usePosForm(): [IPosFormHelper] {

    let [open, setOpen] = useState(true);

    let helper: IPosFormHelper = {
        open,
        show() {
            setOpen(true);
        },
        hide() {    
            setOpen(false);
        }
    }

    return [helper];
}


function PosForm(props: IPosFormProps) {

    let helper = props.form;
    if (!helper) {
        [helper] = usePosForm();
    }

    function onClose() {
        // @ts-ignore
        helper.hide();
    }

    let containerStyle: CSSProperties = {
        height: '290px',
        opacity: 1,
        overflow: 'hidden',
        // transform: '.2s all'
    }

    if (helper.open) {
        if (typeof props.height === 'number') {
            containerStyle.height = props.height + 'px';
        } else if (typeof props.height === 'string') {
            containerStyle.height = props.height;
        }
    } else {
        containerStyle.height = '0px';
        containerStyle.opacity = '0';
    }

    let cardExtra = (
        <Button type="text" icon={<CloseOutlined/>} danger onClick={onClose}/>
    );

    return (
        <div style={containerStyle}>
            <Card title={'新增地点'} size="small" extra={cardExtra}>
                <Form size={'small'} labelCol={{ flex: '4em' }}>
                    <Form.Item label="地名">
                        <Space.Compact size="small">
                            <Input style={{width: 210}}></Input>
                            <Button icon={<EnvironmentOutlined/>}></Button>
                        </Space.Compact>
                    </Form.Item>
                    <Form.Item label="地区">

                    </Form.Item>
                    <Form.Item label="季节">
                        <Select style={{width: 230}}></Select>
                    </Form.Item>

                    <Row>
                        <Col span={12}>
                            <Form.Item label="打卡">
                                <Checkbox></Checkbox>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="天气">
                                <Switch></Switch>
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <div className="f-align-center">
                        <Button style={{ width: 200 }} type="primary" htmlType="submit">提交</Button>
                    </div>
                    
                </Form>
            </Card>
        </div>
    );
}

PosForm.usePosForm = usePosForm;

export default PosForm;