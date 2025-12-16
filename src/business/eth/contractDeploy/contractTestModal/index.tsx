import { Alert, Form, Input, message, Modal, Select, Space, Tag, Typography } from "antd";
import { InteractionOutlined } from '@ant-design/icons';
import styles from './index.module.scss';
import { IContract } from "@/src/types/IContract";
import { ethers } from "ethers";
import { useCallback } from "react";
import { IEthAccount } from "@/src/types/IEthAccount";

const { Text } = Typography;    
const { Option } = Select;

interface IContractTextModalProps {
    isOpen: boolean;
    accountList: IEthAccount[];
    onClose: () => void;
    onOk: () => void;
    onCancel: () => void;
    currentContract: IContract;
}

export default function ContractTextModal(props: IContractTextModalProps) {

    const [interactForm] = Form.useForm();

    // 渲染合约交互界面
    const renderContractInteract = () => {  
        if (!props.currentContract) return null;

        if (!props.currentContract.abi) {
            return (
                <Alert
                    message="无法交互"
                    description="此合约尚未编译或缺少ABI信息，无法进行交互。"
                    type="warning"
                    showIcon
                />
            );
        }

        let abi: any[] = [];
        try {
            abi = JSON.parse(props.currentContract.abi);
        } catch (e) {
            console.error('解析ABI失败:', e);
            return (
                <Alert
                    message="ABI解析失败"
                    description="合约ABI格式不正确，无法进行交互。"
                    type="error"
                    showIcon
                />
            );
        }

        const methods = abi.filter((item: any) => item.type === 'function');

        return (
            <Form form={interactForm} layout="vertical">
                <Form.Item
                    name="method"
                    label="选择方法"
                    rules={[{ required: true, message: '请选择方法' }]}
                >
                    <Select 
                        placeholder="请选择要调用的方法"
                        onChange={(value) => {
                            interactForm.resetFields(['accountId']);
                            // 清除之前的参数值
                            if (value) {
                                const methodAbi = methods.find((m: any) => m.name === value);
                                if (methodAbi && methodAbi.inputs) {
                                    methodAbi.inputs.forEach((input: any) => {
                                        interactForm.setFieldValue(`param_${input.name}`, undefined);
                                    });
                                }
                            }
                        }}
                    >
                        {methods.map((method: any, index: number) => (
                            <Option key={index} value={method.name}>
                                <Space>
                                    <Tag color={method.stateMutability === 'view' || method.stateMutability === 'pure' ? 'blue' : 'orange'}>
                                        {method.stateMutability || 'nonpayable'}
                                    </Tag>
                                    {method.name}
                                </Space>
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.method !== currentValues.method}>
                    {() => {
                        const selectedMethod = interactForm.getFieldValue('method');
                        const methodAbi = methods.find((m: any) => m.name === selectedMethod);
                        
                        return (
                            <>
                                {methodAbi && methodAbi.inputs && methodAbi.inputs.length > 0 && (
                                    <>
                                        <Text strong>方法参数：</Text>
                                        {methodAbi.inputs.map((input: any, index: number) => (
                                            <Form.Item
                                                key={index}
                                                name={`param_${input.name}`}
                                                label={`${input.name} (${input.type})`}
                                                rules={[{ required: true, message: `请输入${input.name}` }]}
                                            >
                                                <Input placeholder={`请输入${input.type}类型的值`} />
                                            </Form.Item>
                                        ))}
                                    </>
                                )}

                                {methodAbi && 
                                 methodAbi.stateMutability !== 'view' && 
                                 methodAbi.stateMutability !== 'pure' && (
                                    <Form.Item
                                        name="accountId"
                                        label="交易账户"
                                        rules={[{ required: true, message: '请选择交易账户' }]}
                                    >
                                        <Select placeholder="请选择用于签名交易的账户">
                                            {props.accountList
                                                .filter(acc => acc.private_key)
                                                .map((account: IEthAccount) => (
                                                    <Option key={account.id} value={account.id}>
                                                        {account.name} ({account.address.substring(0, 8)}...)
                                                    </Option>
                                                ))}
                                        </Select>
                                    </Form.Item>
                                )}
                            </>
                        );
                    }}
                </Form.Item>
            </Form>
        );
    };

    // 调用合约方法
    const callContractMethod = useCallback(async () => {
        if (!props.currentContract) return;

        if (!props.currentContract.address) {
            message.error('合约地址不存在，无法调用方法');
            return;
        }

        try {
            const values = await interactForm.validateFields();
            const methodName = values.method;
            
            if (!props.currentContract.abi) {
                message.error('合约ABI不存在，无法调用方法');
                return;
            }
            
            const abi = JSON.parse(props.currentContract.abi);
            const method = abi.find((item: any) => 
                item.type === 'function' && item.name === methodName
            );

            if (!method) {
                message.error('未找到方法');
                return;
            }

            // 获取网络信息
            // @ts-ignore
            const { data: networks } = await fetch.get('/api/eth/network', {
                params: { id: props.currentContract.network_id }
            });
            
            const network = networks?.[0];
            if (!network) {
                message.error('未找到网络信息');
                return;
            }

            const provider = new ethers.JsonRpcProvider(network.rpc_url);
            
            // 准备参数
            const params = method.inputs.map((input: any) => {
                return values[`param_${input.name}`];
            });

            if (method.stateMutability === 'view' || method.stateMutability === 'pure') {
                // 只读方法，不需要签名
                const contract = new ethers.Contract(props.currentContract.address, abi, provider);
                const result = await contract[methodName](...params);
                
                // 序列化 BigInt 和其他无法序列化的值
                const serializedResult = serializeBigInt(result);
                
                Modal.info({
                    title: '调用结果',
                    width: 600,
                    content: (
                        <div>
                            <Text strong>方法: </Text><Text>{methodName}</Text><br/>
                            <Text strong>返回值: </Text><Text code>{JSON.stringify(serializedResult, null, 2)}</Text>
                        </div>
                    )
                });
            } else {
                // 需要交易的方法
                const account = props.accountList.find((a: IEthAccount) => a.id === values.accountId);
                if (!account || !account.private_key) {
                    message.error('请选择有私钥的账户');
                    return;
                }

                const wallet = new ethers.Wallet(account.private_key, provider);
                const contract = new ethers.Contract(props.currentContract.address, abi, wallet);
                
                message.loading({ content: '正在发送交易...', key: 'call' });
                const tx = await contract[methodName](...params);
                await tx.wait();
                
                message.success({ 
                    content: `交易成功: ${tx.hash}`, 
                    key: 'call',
                    duration: 5
                });
            }

            props.onClose();
        } catch (e: any) {
            console.error('调用失败:', e);
            message.error('调用失败: ' + e.message);
        }
    }, [props.currentContract, interactForm, props.accountList]);

    return <Modal
        title={<Space><InteractionOutlined />合约交互</Space>}
        open={props.isOpen}
        onOk={callContractMethod}
        onCancel={props.onCancel}
        width={700}
        okText="调用"
        cancelText="取消"
        className={styles.interactModal}
    >
        {renderContractInteract()}
    </Modal>
}


// 序列化包含 BigInt 的值
function serializeBigInt(value: any): any {
    // 处理 null 和 undefined
    if (value === null || value === undefined) {
        return value;
    }
    
    // 处理 BigInt
    if (typeof value === 'bigint') {
        return value.toString();
    }
    
    // 处理数组
    if (Array.isArray(value)) {
        return value.map(item => serializeBigInt(item));
    }
    
    // 处理对象（包括 ethers.js 的 Result 类型）
    if (typeof value === 'object') {
        // 检查是否是 ethers.js 的 Result 类型（有 length 属性和数字索引）
        if (typeof value.length === 'number' && value.length > 0) {
            // 可能是数组或 Result 类型，尝试转换为数组
            const arr: any[] = [];
            for (let i = 0; i < value.length; i++) {
                arr.push(serializeBigInt(value[i]));
            }
            // 如果有命名属性，也保留
            const result: any = arr;
            for (const key in value) {
                if (!/^\d+$/.test(key) && value.hasOwnProperty(key)) {
                    result[key] = serializeBigInt(value[key]);
                }
            }
            return result;
        }
        
        // 普通对象
        const result: any = {};
        for (const key in value) {
            if (value.hasOwnProperty(key)) {
                result[key] = serializeBigInt(value[key]);
            }
        }
        return result;
    }
    
    return value;
}