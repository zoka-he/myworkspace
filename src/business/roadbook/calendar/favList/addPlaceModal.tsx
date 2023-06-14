import { Modal, Form, DatePicker, Input, message, InputNumber } from "antd";
import React, { MutableRefObject, useState } from "react";
import GeoSearch from '../../GeoSearch';
import CommonBmap from "../../commonBmap";
import uuid from "@/src/utils/common/uuid";
import fetch from '@/src/fetch';

interface AddPlanModalProps {
    onFinish?: Function
}

interface AddPlanModalState {
    isOpen?: boolean,
    bmapCenter: any,
    bmapHighlight: any
}

class AddPlanModal extends React.Component<AddPlanModalProps, AddPlanModalState> {

    private bmap: any = null;
    private m_form: (typeof Form) | null = null;
    private oldData: any = null;

    constructor() {
        super({});

        this.state = {
            isOpen: false,
            bmapCenter: null,
            bmapHighlight: null,
        }

    }

    show() {
        this.oldData = null;
        this.setState({ isOpen: true });
        this.fillData();
    }

    showAndEdit(data: any) {
        this.oldData = data;
        this.setState({ isOpen: true });
        this.fillData();
    }

    close() {
        this.setState({ isOpen: false });
    }

    getInitalValues() {
        return {

        }
    }

    fillData() {
        if (!this.m_form) {
            return;
        }

        if (!this.bmap) {
            return;
        }

        if (!this.oldData) {
            this.setState({
                bmapCenter: null,
                bmapHighlight: null,
            });

            // @ts-ignore
            this.m_form.setFieldsValue({
                title: null,
                lng: null,
                lat: null
            })
        } else {
            this.setState({
                bmapCenter: new BMapGL.Point(this.oldData.lng, this.oldData.lat),
                bmapHighlight: new BMapGL.Point(this.oldData.lng, this.oldData.lat),
            });

            //@ts-ignore
            this.m_form.setFieldsValue({
                title: this.oldData.label,
                lng: this.oldData.lng,
                lat: this.oldData.lat
            })
        }
    }

    onBmapReady(bmap: any) {
        this.bmap = bmap;
        this.fillData();
    }

    onFormReady(form: typeof Form | null) {
        this.m_form = form;
        // this.fillData();
    }

    onGeoSearchAddress(pt: any, title: string) {
        this.setState({ bmapCenter: pt, bmapHighlight: pt });
        if (this.m_form) {
            //@ts-ignore
            this.m_form.setFieldsValue({
                title: title,
                lng: pt.lng,
                lat: pt.lat
            })
        }
    }

    onMapClick(pt: any, title: any) {
        this.setState({ bmapHighlight: pt });
        if (this.m_form) {
            //@ts-ignore
            this.m_form.setFieldsValue({
                title: title.longAddr,
                lng: pt.lng,
                lat: pt.lat
            })
        }
    }

    renderAddrMk() {
        let pt = this.state.bmapHighlight;

        if (!pt) {
            return null;
        }

        return <CommonBmap.Marker lng={pt.lng} lat={pt.lat} key={uuid()}/>
    }

    async savePlace() {
        if (!this.m_form) {
            console.error('m_form is null');
            return;
        }

        // @ts-ignore
        let formContext = this.m_form.getFieldsValue();

        try {
            let body: any = {
                label: formContext.title,
                lat: formContext.lat,
                lng: formContext.lng,
            };

            if (this.oldData) {
                body.ID = this.oldData.ID;
            }

            let resp = await fetch.post('/api/roadPlan/favGeoLocation', body);
            this.close();
        } catch(e: any) {
            console.error(e);
            message.error(e.message);
        }

        if (typeof this.props.onFinish === 'function') {
            this.props.onFinish();
        }

        // this.close();
    }

    onModalOk() {
        this.savePlace();
        return false;
    }

    render() {
        return (
            <>
                <Modal title="添加地点" open={this.state.isOpen} width={'60vw'}
                       onCancel={this.close.bind(this)}
                       onOk={this.onModalOk.bind(this)}
                >
                    <div className="f-flex-row" style={{ height: '60vh' }}>
                        <div className="f-fit-height" style={{ width: '400px' }}>
                            <div className="f-flex-row">
                                <label>搜索：</label>
                                { /* @ts-ignore */ }
                                <GeoSearch className="f-flex-1" map={() => this.bmap} 
                                           onAddress={(pt: any, title: string) => this.onGeoSearchAddress(pt, title)}
                                           center={this.state.bmapHighlight}
                                />
                            </div>
                            <hr />
                            { /* @ts-ignore */ }
                            <Form ref={(comp: Form | null) => this.onFormReady(comp)} initialValues={this.getInitalValues()}>
                                <Form.Item label="地区" name="title">
                                    <Input.TextArea></Input.TextArea>
                                </Form.Item>
                                <Form.Item label="经度" name="lng">
                                    <InputNumber style={{ width: '180px' }} precision={6}/>
                                </Form.Item>
                                <Form.Item label="纬度" name="lat">
                                    <InputNumber style={{ width: '180px' }} precision={6}/>
                                </Form.Item>
                            </Form>
                        </div>
                        <div className="f-flex-1 f-relative m-plan_editor-map" style={{margin: '0 0 0 10px'}}>
                            <CommonBmap onReady={(bmap: any) => this.onBmapReady(bmap)}
                                        center={this.state.bmapCenter}
                                        onClick={(pt: any, title: string) => this.onMapClick(pt, title)}
                            >
                                { this.renderAddrMk() }
                            </CommonBmap>
                        </div>
                    </div>
                </Modal>
            </>
        )
    }
}

export default AddPlanModal;