import { AutoComplete, Button, Input, InputNumber, Select, Space, Table } from "antd";

export default function() {
    return (
        <div className="f-fit-height">
            <div className="f-two-side" style={{ marginBottom: '5px' }}>
                <Space>
                    <label>花鼓品牌：</label>
                    <AutoComplete style={{ width: 140 }}></AutoComplete>

                    <label>花鼓型号：</label>
                    <Input style={{ width: 120 }}></Input>

                    <label>前/后：</label>
                    <Select style={{ width: 80 }}>
                        <Select.Option value="front">前</Select.Option>
                        <Select.Option value="back">后</Select.Option>
                    </Select>

                    <label>直头/弯头：</label>
                    <Select style={{ width: 80 }}>
                        <Select.Option value="straight">直头</Select.Option>
                        <Select.Option value="curved">弯头</Select.Option>
                    </Select>

                    <label>辐条数：</label>
                    <InputNumber style={{ width: 80 }}></InputNumber>


                    <label>开档：</label>
                    <Select style={{ width: 80 }}>
                        <Select.Option value="100">100mm</Select.Option>
                        <Select.Option value="130">130mm</Select.Option>
                        <Select.Option value="135">135mm</Select.Option>
                    </Select>
                </Space>

                <Space>
                    <Button type="primary">添加</Button>
                </Space>
            </div>

            <Table scroll={{ y: 'calc(80%)' }}>
                <Table.Column title="花鼓品牌"></Table.Column>   
                <Table.Column title="花鼓型号"></Table.Column>   
                <Table.Column title="直头/弯头"></Table.Column>   
                <Table.Column title="快拆/桶轴"></Table.Column>   
                <Table.Column title="前/后"></Table.Column>   
                <Table.Column title="辐条数"></Table.Column>   
                <Table.Column title="开档"></Table.Column>   
                <Table.Column title="左1法兰距"></Table.Column>   
                <Table.Column title="左1法兰直径"></Table.Column>   
                <Table.Column title="左2法兰距"></Table.Column>   
                <Table.Column title="左2法兰直径"></Table.Column>   
                <Table.Column title="右1法兰距"></Table.Column>   
                <Table.Column title="右1法兰直径"></Table.Column>   
                <Table.Column title="右2法兰距"></Table.Column>   
                <Table.Column title="右2法兰直径"></Table.Column>   
                <Table.Column title="操作"></Table.Column>   
            </Table>

        </div>
    )
}