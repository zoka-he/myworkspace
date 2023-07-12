import { AutoComplete, Button, Input, InputNumber, Select, Space, Table } from "antd";

export default function() {
    return (
        <div className="f-fit-height">
            <div className="f-two-side" style={{ marginBottom: '5px' }}>
                <Space>
                    <label>车圈品牌：</label>
                    <AutoComplete style={{ width: 140 }}></AutoComplete>

                    <label>车圈型号：</label>
                    <Input style={{ width: 120 }}></Input>


                    <label>辐条数：</label>
                    <InputNumber style={{ width: 80 }}></InputNumber>

                    <label>直径：</label>
                    <Select style={{ width: 90 }}>
                        <Select.Option value="622">700C</Select.Option>
                        <Select.Option value="571">650C</Select.Option>
                        <Select.Option value="559">26寸</Select.Option>
                        <Select.Option value="584">27.5寸</Select.Option>
                        <Select.Option value="622">29寸</Select.Option>
                        <Select.Option value={null} default>自定义</Select.Option>
                    </Select>
                    <InputNumber style={{ width: 80 }}></InputNumber>
                </Space>

                <Space>
                    <Button type="primary">添加</Button>
                </Space>
            </div>

            <Table scroll={{ y: 'calc(80%)' }}>
                <Table.Column title="车圈品牌"></Table.Column>   
                <Table.Column title="车圈型号"></Table.Column>   
                <Table.Column title="碟刹/圈刹"></Table.Column>     
                <Table.Column title="辐条数"></Table.Column>
                <Table.Column title="直径"></Table.Column>   
                <Table.Column title="框高"></Table.Column>   
                <Table.Column title="操作"></Table.Column>   
            </Table>

        </div>
    )
}