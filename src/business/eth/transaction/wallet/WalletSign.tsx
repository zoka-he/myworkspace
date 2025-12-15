import { IContract } from "@/src/types/IContract";
import { Button, Input, message, Select, Space, Typography } from "antd";
import { useState, useEffect, useContext, createContext } from "react";
import fetch from "@/src/fetch";
import { ethers } from "ethers";
import { useWalletContext } from "../WalletContext";
import { CheckOutlined, CloseOutlined, CopyOutlined } from "@ant-design/icons";
import copyToClip from "@/src/utils/common/copy";

export default function WalletSign() {

    const [contractList, setContractList] = useState<IContract[]>([]);
    const [selectedContract, setSelectedContract] = useState<IContract | null>(null);

    useEffect(() => {
        fetchContractList();
    }, []);

    async function fetchContractList() {
        const { data } = await fetch.get('/api/eth/contract', {
            params: {
                page: 1,
                limit: 100,
                status: 'deployed',
            },
        });
        setContractList(data || []);
    }

    function renderContractList(contractList: IContract[]) {
        return contractList.map((contract) => {
            return {
                label: contract.name,
                value: contract.address,
            }
        });
    }

    return <div>
        <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
                <Typography.Text>合约：</Typography.Text>
                <Select 
                    style={{ width: '200px' }}
                    options={renderContractList(contractList)} 
                    value={selectedContract?.address} 
                    onChange={(value) => {
                        setSelectedContract(contractList.find((contract) => contract.address === value) || null);
                    }} 
                />
            </Space>
            <ContractContext.Provider value={{ contract: selectedContract }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Signer />
                    <Verifier />
                </Space>
            </ContractContext.Provider>
        </Space>
    </div>;
}

const ContractContext = createContext<{
    contract: IContract | null;
}>({
    contract: null
});

function Signer() {
    const { contract } = useContext(ContractContext);
    const { getWalletProvider, isWalletConnected, accountInfo } = useWalletContext();
    const [textToSign, setTextToSign] = useState('');
    const [signature, setSignature] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSign() {
        if (!contract?.address) {
            message.error('请选择合约');
            return;
        };
        
        const walletProvider = getWalletProvider();
        if (!walletProvider) {
            message.error('请连接钱包');
            return;
        }

        if (!textToSign) {
            message.error('请输入要签名的文本');
            return;
        }

        setLoading(true);
        try {
            console.log('开始签名流程...');
            
            // // 先确保账户已连接            
            // if (!accountInfo?.selectedAddress) {
            //     throw new Error('未获取到账户，请授权账户访问');
            // }
            
            // const address = accountInfo?.selectedAddress;
            
            // // 创建 provider 和 signer
            // const provider = new ethers.JsonRpcProvider(walletProvider);
            // console.log('获取 signer...');
            // const signer = await provider.getSigner();
            // const signerAddress = await signer.getAddress();
            // console.log('Signer 地址:', signerAddress);
            
            // if (signerAddress.toLowerCase() !== address.toLowerCase()) {
            //     console.warn('账户地址不匹配，使用:', signerAddress);
            // }
            
            // console.log('请求签名，请在钱包中确认...');
            // message.info('请在钱包扩展中确认签名请求', 5);
            
            // 添加超时处理
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('签名超时，请检查钱包扩展是否响应')), 60000); // 60秒超时
            });
            
            // let signature: string;
            
            // try {
            //     // 方法1: 使用 ethers signMessage (推荐)
            //     console.log('尝试使用 ethers signMessage...');
            //     signature = await Promise.race([
            //         signer.signMessage(textToSign),
            //         timeoutPromise
            //     ]) as string;
            // } catch (ethersError: any) {
            //     console.warn('ethers signMessage 失败，尝试使用 personal_sign:', ethersError);
                
                // 方法2: 使用原生的 personal_sign 方法（备选方案）
                // personal_sign 会自动添加 Ethereum 消息前缀，所以直接传入文本的 hex
                const messageHex = ethers.hexlify(ethers.toUtf8Bytes(textToSign));
                
                console.log('使用 personal_sign 方法，待签名消息:', messageHex);
                let result = await Promise.race([
                    walletProvider.request({
                        method: 'personal_sign',
                        params: [messageHex, accountInfo?.selectedAddress]
                    }) as Promise<string>,
                    timeoutPromise
                ]) as string;
            // }
            
            console.log('签名成功:', result);
            setSignature(result);
            message.success('签名成功');
        } catch (error: any) {
            console.error('签名错误:', error);
            const errorMessage = error?.message || error?.reason || '签名失败';
            message.error(errorMessage);
            
            // 如果是用户拒绝，给出更友好的提示
            if (errorMessage.includes('reject') || errorMessage.includes('denied') || errorMessage.includes('User rejected') || errorMessage.includes('user rejected')) {
                message.warning('您已取消签名');
            } else if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
                message.error('签名超时，请检查钱包扩展是否正常工作');
            }
        } finally {
            setLoading(false);
        }
    }

    return <div><Space>
        <Typography.Text>信息：</Typography.Text>
        <Space.Compact>
            <Input value={textToSign} onChange={(e) => setTextToSign(e.target.value)} />
            <Button icon={<CopyOutlined />} onClick={() => copyToClip(textToSign)} />
        </Space.Compact>

        <Space.Compact>
            <Button type="primary" loading={loading} onClick={() => {
                handleSign();
            }}>签名-&gt;</Button>
            <Input value={signature} readOnly />
            <Button icon={<CopyOutlined />} onClick={() => copyToClip(signature)} />
        </Space.Compact>
    </Space></div>;
}

function Verifier() {
    const { contract } = useContext(ContractContext);
    const { getWalletProvider, accountInfo } = useWalletContext();
    
    const [textToSign, setTextToSign] = useState('');
    const [signature, setSignature] = useState('');
    const [result, setResult] = useState('');

    async function handleVerify() {
        if (!contract?.address) {
            message.error('请选择合约');
            return;
        }

        const provider = getWalletProvider();
        if (!provider) {
            message.error('请连接钱包');
            return;
        }

        if (!signature) {
            message.error('请输入签名');
            return;
        }
        const result = await ethers.verifyMessage(textToSign, signature);
        setResult(result);
    }

    let isCorrect = null;
    if (result) {
        isCorrect = result?.toLowerCase() === accountInfo?.selectedAddress?.toLowerCase() ? <CheckOutlined/> : <CloseOutlined/>;
    }
    
    return (
        <div>
            <Space>
                <Typography.Text>信息：</Typography.Text>
                <Space.Compact>
                    <Input value={textToSign} onChange={(e) => setTextToSign(e.target.value)} />
                    <Button icon={<CopyOutlined />} onClick={() => copyToClip(textToSign)} />
                </Space.Compact>    
                <Typography.Text>签名：</Typography.Text>
                <Space.Compact>
                    <Input value={signature} onChange={(e) => setSignature(e.target.value)} />
                    <Button icon={<CopyOutlined />} onClick={() => copyToClip(signature)} />
                </Space.Compact>

                <Space.Compact>
                    <Button type="primary" onClick={() => {
                        handleVerify();
                    }}>验证-&gt;</Button>
                    <Input value={result} readOnly suffix={isCorrect} />
                </Space.Compact>
            </Space>
        </div>
    );
}