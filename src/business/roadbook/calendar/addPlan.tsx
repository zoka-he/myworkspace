import { Modal, Form, DatePicker, InputNumber } from "antd";
import React, { useState } from "react";
import PlanSelect from "../planSelect";


interface AddPlanModalProps {

}

interface AddPlanModalState {
    isOpen?: boolean
}

class AddPlanModal extends React.Component<AddPlanModalProps, AddPlanModalState> {

    constructor() {
        super({});

        this.state = {
            isOpen: false
        }
    }

    show() {
        this.setState({ isOpen: true });
    }

    showAndEdit() {
        this.show();
    }

    close() {
        this.setState({ isOpen: false });
    }

    getInitalValues() {
        return {
            planId: null,
            beginDate: null,
            bookingDate: 2,
            luggageDate: 1
        }
    }

    render() {
        return (
            <>
                <Modal title="添加计划" open={this.state.isOpen} 
                        onCancel={this.close.bind(this)}>
                    <Form initialValues={this.getInitalValues()}>
                        <Form.Item label="选择计划" name="planId">
                            <PlanSelect/>
                        </Form.Item>
                        <Form.Item label="出发日期" name="beginDate">
                            <DatePicker/>
                        </Form.Item>
                        <Form.Item label="订票/租车" name="bookingDate">
                            <InputNumber addonBefore="T -" addonAfter="天"/>
                        </Form.Item>
                        <Form.Item label="准备行李" name="luggageDate">
                            <InputNumber addonBefore="T -" addonAfter="天"/>
                        </Form.Item>
                    </Form>
                </Modal>
            </>
        )
    }
}

export default AddPlanModal;