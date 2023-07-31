import { Form, Radio, Tabs, Modal } from "antd";
import { useEffect, useState } from "react";

interface DlgHelper {
    open: Function,
    close: Function,
    dlgState: boolean
}

function useDlg(): DlgHelper {

    let [dlgState, setDlgState] = useState(false);

    function open() {
        setDlgState(true);
    }

    function close() {
        setDlgState(false);
    }

    return {
        open,
        close,
        dlgState
    }
}

interface AppendStructureDlgProps {
    dlgCtl: DlgHelper;
}

function AppendWheel() {
    return (
        <Form>
            <Form.Item>
                <Radio.Group>
                    <Radio>前</Radio>
                    <Radio>后</Radio>
                </Radio.Group>
            </Form.Item>
        </Form>
    )
}

function AppendStructureDlg(props: AppendStructureDlgProps) {

    let ctl = props.dlgCtl;
    if (!ctl) {
        ctl = useDlg();
    }

    let tabs = [
        {
            key: '1',
            label: `自行车`,
            children: <div></div>,
        },
        {
            key: '2',
            label: `轮组`,
            children: <div></div>,
        },
        {
            key: '3',
            label: `飞艇数据`,
            children: <div></div>,
        },
    ];

    function onOk() {
        ctl.close();
    }

    return (
        <Modal title="添加设定" open={ctl.dlgState} 
            onCancel={e => ctl.close()} onOk={e => onOk()}>
            <Tabs items={tabs} defaultActiveKey="1">

            </Tabs>
        </Modal>
    )
}

export default AppendStructureDlg;
export {
    useDlg,
}

export type {
    DlgHelper
}