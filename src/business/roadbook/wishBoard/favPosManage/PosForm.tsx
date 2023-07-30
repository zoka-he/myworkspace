import { Button, Card, Checkbox, Col, Form, Input, Row, Space, Switch, Tag, DatePicker, message, Dropdown, MenuProps } from "antd";
import { CloseOutlined, EnvironmentOutlined, SyncOutlined, DownOutlined, DeleteOutlined } from '@ant-design/icons';
import { CSSProperties, useEffect, useRef, useState } from "react";
import GaodeSearch from '../../GeoSearch/gaodeSearch';
import GeoCoder from "@/src/utils/geo/GeoCoder";
import { blue } from '@ant-design/colors';
import fetch from '@/src/fetch';
import DayJS from 'dayjs';

interface IPosFormProps {
    form?: IPosFormHelper,
    height?: string | number,
    mapType?: string,
    onFinish?: Function
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
    let lastPayload = useRef<any>();

    let helper: IPosFormHelper = {
        open,
        payload,
        show() {
            setPayload({});
            lastPayload.current = {};
            setOpen(true);
        },
        hide() {    
            setPayload(null);
            lastPayload.current = null;
            setOpen(false);
        },
        showAndEdit(obj: any) {
            setPayload(obj);
            lastPayload.current = obj;
            setOpen(true);
        },
        setLnglat(lng: number, lat: number) {
            let _payload = { ...lastPayload.current } || {};
            _payload.lng = lng;
            _payload.lat = lat;
            _payload._gpsChanged = true;
            console.debug('setLnglat', _payload);
            setPayload(_payload);
            lastPayload.current = _payload;
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
    if (obj2.arrived_date) {
        obj2.arrived_date = DayJS(obj2.arrived_date);
    }
    

    return obj2;
}

function form2db(obj: any) {
    let obj2 = { ...obj };

    if (obj2.use_weather) {
        obj2.use_weather = 1;
    } else {
        obj2.use_weather = 0;
    }

    obj2.lng = parseFloat(obj2.lng);
    obj2.lat = parseFloat(obj2.lat);

    if (obj2.arrived_date) {
        obj2.arrived_date = obj2.arrived_date.format('YYYY-MM-DD');
    }
    

    return obj2;
}


function PosForm(props: IPosFormProps) {

    let helper = props.form;
    let [form] = Form.useForm();
    let [provinceCode, setProvicneCode] = useState<string | null>(null);
    let [mapAddr, setMapAddr] = useState('');
    let [alertChange, setAlertChange] = useState(false);

    if (!helper) {
        helper = usePosForm()[0];
    }

    let hasLnglat = false;
    if (!isNaN(helper.payload?.lng) && !isNaN(helper.payload?.lat)) {
        hasLnglat = true;
    }

    useEffect(() => {
        if (helper?.open && helper?.payload) {
            let formdata = db2form(helper?.payload);
            form.setFieldsValue(formdata);
            updateAddr(true);
            setAlertChange(helper.payload.ID && helper.payload._gpsChanged);
        } else {
            form.resetFields();
            updateAddr(true);
            setAlertChange(false);
        }
    }, [helper.open, helper.payload]);

    function onClose() {
        // @ts-ignore
        helper.hide();
    }

    async function updateAddr(forced: boolean = false) {

        if (!hasLnglat) {
            setMapAddr('');
            if (helper?.payload?._gpsChanged || forced) {
                setProvicneCode(null);
            }
            return;
        }

        try {
            let addr: any = await GaodeSearch.getAddr(helper?.payload.lng, helper?.payload.lat);
            let province = addr?.addressComponent?.province;
            console.debug('addressComponent', addr?.addressComponent);

            let fullAddr = addr.formattedAddress;
            if (/.+(省|自治区|自治州)(.*)/.test(fullAddr)) {
                setMapAddr(RegExp.$2);
            } else {
                setMapAddr(addr.formattedAddress);
            }
            

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
        } catch(e: any) {
            console.error(e);
            message.error('查询目标地址失败');

            setMapAddr('');
            if (helper?.payload._gpsChanged || forced) {
                setProvicneCode(null);
            }
        }
    }

    async function onSubmit(formData: any) {
        let dbData = form2db({
            ...formData,
            lng: helper?.payload.lng,
            lat: helper?.payload.lat,
            province_code: provinceCode,
            map_type: props.mapType
        });

        if (helper?.payload?.ID) {
            dbData.ID = helper?.payload?.ID;
        }

        console.debug('submit', dbData);

        try {
            let body: any = dbData;

            if (dbData.ID) {
                await fetch.post('/api/roadPlan/favGeoLocation', body, { params: { ID: dbData.ID } });
            } else {
                await fetch.post('/api/roadPlan/favGeoLocation', body);
                // 保存后，ID发生变化，先关闭之
                onClose();
            }
            message.success('已更新“' + dbData.label + '”');

            if (typeof props.onFinish === 'function') {
                props.onFinish();
            }
            
        } catch(e: any) {
            console.error(e);
            message.error(e.message);
        }
    }

    async function onDelete() {
        let ID = helper?.payload.ID;
        if (!ID) {
            message.error('无法执行删除，因为没有ID');
        }

        await fetch.delete('/api/roadPlan/favGeoLocation', { params: { ID } });
        message.success('已删除‘' + helper?.payload.label + '’');
        onClose();

        if (typeof props.onFinish === 'function') {
            props.onFinish();
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

    

    let cardExtra = (
        <Button type="text" icon={<CloseOutlined/>} danger onClick={onClose}/>
    );

    let provinceTags = <Tag>全国</Tag>;
    if (provinceCode) {
        provinceTags = <Tag color={blue[6]}>{GeoCoder.findProvinceOfCode(provinceCode)}</Tag>
    }

    let buttonExtra: MenuProps = {
        items: [
            {
                label: '删除',
                key: 'delete',
                danger: true,
                icon: <DeleteOutlined/>,
                disabled: !helper.payload?.ID
            }
        ],
        onClick(e) {
            switch(e.key) {
                case 'delete':
                    onDelete();
                    break;
            }
        }
    }

    let changeHint = {};
    if (alertChange) {
        changeHint = {
            hasFeedback: true,
            validateStatus: "warning",
            help: '地点GPS已变更，请谨慎操作！'
        }
    }

    return (
        <div className="m-fav-pos-form" style={containerStyle}>
            <Card title={'新增地点'} size="small" extra={cardExtra}>
                <Form form={form} size={'small'} labelCol={{ flex: '4em' }}
                    onFinish={onSubmit}
                >
                    

                    <Form.Item label="地名" {...changeHint}>
                        <Space.Compact size="small">
                            <Form.Item noStyle name="label">
                                <Input style={{width: 210}}></Input>
                            </Form.Item>
                            <Button icon={<EnvironmentOutlined/>} disabled={!hasLnglat}></Button>
                        </Space.Compact>
                    </Form.Item>

                    <Form.Item label="地址">
                        <span>{mapAddr || <i>无数据</i>}</span>
                        <Button type="link" size={'small'}>填入</Button>
                    </Form.Item>
                    
                    <Form.Item label="地区">
                        {provinceTags}
                        <Button icon={<SyncOutlined/>} disabled={!hasLnglat} onClick={() => updateAddr(true)}></Button>
                    </Form.Item>

                    <Form.Item label="季节" name="prefer_month">
                        <Checkbox.Group>
                            <Row>
                                <Col span={4}><Checkbox value={1}>1</Checkbox></Col>
                                <Col span={4}><Checkbox value={2}>2</Checkbox></Col>
                                <Col span={4}><Checkbox value={3}>3</Checkbox></Col>
                                <Col span={4}><Checkbox value={4}>4</Checkbox></Col>
                                <Col span={4}><Checkbox value={5}>5</Checkbox></Col>
                                <Col span={4}><Checkbox value={6}>6</Checkbox></Col>
                            </Row>
                            <Row>
                                <Col span={4}><Checkbox value={7}>7</Checkbox></Col>
                                <Col span={4}><Checkbox value={8}>8</Checkbox></Col>
                                <Col span={4}><Checkbox value={9}>9</Checkbox></Col>
                                <Col span={4}><Checkbox value={10}>10</Checkbox></Col>
                                <Col span={4}><Checkbox value={11}>11</Checkbox></Col>
                                <Col span={4}><Checkbox value={12}>12</Checkbox></Col>
                            </Row>
                        </Checkbox.Group>
                    </Form.Item>

                    <Row>
                        <Col span={12}>
                            <Form.Item label="打卡" name="arrived_date">
                                <DatePicker></DatePicker>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="天气" name='use_weather' valuePropName="checked">
                                <Switch></Switch>
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <div className="f-align-center">
                        <Space align="center">
                            <Button style={{ width: 200 }} type="primary" htmlType="submit" size="small"
                                    disabled={!hasLnglat}
                            >提交</Button>
                            <Dropdown menu={buttonExtra} placement="bottomRight">
                                <Button>
                                    <DownOutlined/>
                                </Button>
                            </Dropdown>
                        </Space>
                    </div>
                    
                </Form>
            </Card>
        </div>
    );
}

PosForm.usePosForm = usePosForm;

export default PosForm;