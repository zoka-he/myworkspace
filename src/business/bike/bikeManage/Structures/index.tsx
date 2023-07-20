import { Button, Input, Space, Tree } from "antd";
import { DlgHelper } from "../AppendStructureDlg";

interface StructuresProps {
    dlgCtl: DlgHelper
}

export default function(props: StructuresProps) {

    function onAddStructure() {
        if (props.dlgCtl) {
            props.dlgCtl.open();
        }
    }

    return (
        <div>
            <Space>
                <label>搜索：</label>
                <Input></Input>
                <Button type={'primary'} onClick={onAddStructure}>添加</Button>
            </Space>
            { /** @ts-ignore */ }
            <Tree>
            </Tree>
        </div>
    )
}