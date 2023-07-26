import { Button, Card, Checkbox, Col, Form, Input, Row, Select, Space, Switch, Tag } from "antd";
import { CloseOutlined, EnvironmentOutlined, SyncOutlined } from '@ant-design/icons';
import { CSSProperties, useEffect, useState } from "react";
import GaodeSearch from '../../GeoSearch/gaodeSearch';
import GeoCoder from "@/src/utils/geo/GeoCoder";
import { blue } from '@ant-design/colors';

interface IPosFormProps {
    form?: IPosFormHelper,
    height?: string | number,
}

interface IPosFormHelper {
    open: boolean;
    payload: any;
    show: Function;
    hide: Function;
    showAndEdit: Function;
    setLnglat: Function;
}

function usePosForm(): [IPosFormHelper] {

    let [open, setOpen] = useState(false);
    let [payload, setPayload] = useState<any>(null);

    let helper: IPosFormHelper = {
        open,
        payload,
        show() {
            setPayload({});
            setOpen(true);
        },
        hide() {    
            setPayload(null);
            setOpen(false);
        },
        showAndEdit(obj: any) {
            setPayload(obj);
            setOpen(true);
        },
        setLnglat(lng: number, lat: number) {
            let _payload = payload || {};
            _payload.lng = lng;
            _payload.lat = lat;
            _payload._gpsChanged = true;
            setPayload(_payload);
        }
    }

    return [helper];
}

function db2form(obj: any) {
    let obj2 = { ...obj };
    if (obj2.use_weather == 1) {
        obj2.use_weather = true;
    } else {
        obj2.use_weather = false;
    }

    obj2.lng = parseFloat(obj2.lng);
    obj2.lat = parseFloat(obj2.lat);

    return obj2;
}

function form2db(obj: any) {
    let obj2 = { ...obj };
    if (obj2.use_weather) {
        obj2.use_weather = 1;
    } else {
        obj2.use_weather = 0;
    }

    return obj2;
}


function PosForm(props: IPosFormProps) {

    let helper = props.form;
    let [form] = Form.useForm();
    let [provinceCode, setProvicneCode] = useState<string | null>(null);

    if (!helper) {
        helper = usePosForm()[0];
    }

    useEffect(() => {
        if (helper?.open && helper?.payload) {
            console.debug('编辑地点', db2form(helper?.payload));
            form.setFieldsValue(db2form(helper.payload));
            updateAddr();
        } else {
            form.resetFields();
        }
    }, [helper.open, helper.payload]);

    function onClose() {
        // @ts-ignore
        helper.hide();
    }

    async function updateAddr(forced: boolean = false) {
        let addr: any = await GaodeSearch.getAddr(helper?.payload.lng, helper?.payload.lat);
        let province = addr?.addressComponent?.province;
        console.debug('province', province);

        if (helper?.payload._gpsChanged || forced) {
            let code = GeoCoder.findCodeOfProvince(province);
            if (typeof code === 'string') {
                setProvicneCode(code);
            } else {
                setProvicneCode(null);
            }
        } else {
            setProvicneCode(helper?.payload.provinceCode || null);
        }
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

    let hasLnglat = false;
    if (!isNaN(helper.payload?.lng) && !isNaN(helper.payload?.lat)) {
        hasLnglat = true;
    }

    let cardExtra = (
        <Button type="text" icon={<CloseOutlined/>} danger onClick={onClose}/>
    );

    let provinceTags = <Tag>全国</Tag>;
    if (provinceCode) {
        provinceTags = <Tag color={blue[6]}>{GeoCoder.findProvinceOfCode(provinceCode)}</Tag>
    }

    return (
        <div style={containerStyle}>
            <Card title={'新增地点'} size="small" extra={cardExtra}>
                <Form form={form} size={'small'} labelCol={{ flex: '4em' }}>
                    

                    <Form.Item label="地名">
                        <Space.Compact size="small">
                            <Form.Item noStyle name="label">
                                <Input style={{width: 210}}></Input>
                            </Form.Item>
                            <Button icon={<EnvironmentOutlined/>} disabled={!hasLnglat}></Button>
                        </Space.Compact>
                    </Form.Item>
                    
                    <Form.Item label="地区">
                        {provinceTags}
                        <Button icon={<SyncOutlined/>} disabled={!hasLnglat} onClick={() => updateAddr(true)}></Button>
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
                            <Form.Item label="天气" name='use_weather' valuePropName="checked">
                                <Switch></Switch>
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <div className="f-align-center">
                        <Button style={{ width: 200 }} type="primary" htmlType="submit"
                                 disabled={!hasLnglat}
                        >提交</Button>
                    </div>
                    
                </Form>
            </Card>
        </div>
    );
}

PosForm.usePosForm = usePosForm;

export default PosForm;