import { Modal, Form, DatePicker, InputNumber, Select, Input } from "antd";
import React from "react";


interface AddRemarkModalProps {

}

interface AddRemarkModalState {
    isOpen?: boolean
}

class AddRemarkModal extends React.Component<AddRemarkModalProps, AddRemarkModalState> {

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
            type: null,
            desc: null,
            date: null,
        }
    }

    render() {
        return (
            <>
                <Modal title="添加备注" open={this.state.isOpen} 
                        onCancel={this.close.bind(this)}>
                    <Form initialValues={this.getInitalValues()}>
                        <Form.Item label="日期" name="date">
                            <DatePicker/>
                        </Form.Item>
                        <Form.Item label="类型" name="type">
                            <Select/>
                        </Form.Item>
                        <Form.Item label="说明" name="desc">
                            <Input.TextArea/>
                        </Form.Item>
                    </Form>
                </Modal>
            </>
        )
    }
}

export default AddRemarkModal;