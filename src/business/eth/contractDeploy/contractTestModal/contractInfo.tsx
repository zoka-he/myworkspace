import { IContract, IContractMethod } from "@/src/types/IContract";
import { Button, Card, Descriptions, Divider, Tag } from "antd";
import { Typography } from "antd";
import { useMemo } from "react";
const { Text } = Typography;


interface IContractInfoProps {
    contract: IContract | null;
    onMethodClick: (method: IContractMethod) => void;
}

export default function ContractInfo(props: IContractInfoProps) {

    const methods = useMemo(() => {
        if (!props.contract?.abi) return [];
        let abi: any[] = JSON.parse(props.contract.abi);
        return abi.filter((item: any) => item.type === 'function') || [];
    }, [props.contract]);

    function renderMethods() {
        return <ul>
            {methods.map((method: any) => (
                <li key={method.name}>
                    <Tag color={method.stateMutability === 'view' || method.stateMutability === 'pure' ? 'blue' : 'orange'}>
                        {method.stateMutability || 'nonpayable'}
                    </Tag>
                    <Button type="link" onClick={() => props.onMethodClick(method)}>{method.name}</Button>
                </li>
            ))}
        </ul>
    }

    return (
        <Card title="合约信息" size="small">
            <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="合约名称">
                    <Text>{props.contract?.name || ''}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="合约地址">
                    <Text>{props.contract?.address || ''}</Text>
                </Descriptions.Item>
            </Descriptions>
            <Divider>
                <span>合约方法</span>
            </Divider>
            {renderMethods()}
        </Card>
    )
}