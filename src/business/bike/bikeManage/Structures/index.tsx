import { Button, Input, Space, Tree } from "antd";

export default function() {
    return (
        <div>
            <Space>
                <label>搜索：</label>
                <Input></Input>
                <Button type={'primary'}>添加</Button>
            </Space>
            { /** @ts-ignore */ }
            <Tree>
            </Tree>
        </div>
    )
}