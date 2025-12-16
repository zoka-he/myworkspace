import { IContract } from "@/src/types/IContract";
import { Button, Input, message, Space, Typography, Card, Divider, Row, Col } from "antd";
import { useState, useEffect, createContext } from "react";
import { ethers } from "ethers";
import { useWalletContext } from "../WalletContext";
import { CheckOutlined, CloseOutlined, CopyOutlined, EditOutlined, SafetyCertificateOutlined, SnippetsOutlined } from "@ant-design/icons";
import copyToClip from "@/src/utils/common/copy";
import styles from './WalletSign.module.scss';

export default function WalletSign() {

    // const [contractList, setContractList] = useState<IContract[]>([]);
    // const [selectedContract, setSelectedContract] = useState<IContract | null>(null);

    useEffect(() => {
        // fetchContractList();
    }, []);

    // async function fetchContractList() {
    //     const { data } = await fetch.get('/api/eth/contract', {
    //         params: {
    //             page: 1,
    //             limit: 100,
    //             status: 'deployed',
    //         },
    //     });
    //     setContractList(data || []);
    // }

    function renderContractList(contractList: IContract[]) {
        return contractList.map((contract) => {
            return {
                label: contract.name,
                value: contract.address,
            }
        });
    }

    return <div className={styles.walletSign}>
        <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
                <Signer />
            </Col>
            <Col xs={24} lg={12}>
                <Verifier />
            </Col>
        </Row>
    </div>;
}

const ContractContext = createContext<{
    contract: IContract | null;
}>({
    contract: null
});

function Signer() {
    const { getWalletProvider, accountInfo } = useWalletContext();
    const [textToSign, setTextToSign] = useState('');
    const [signature, setSignature] = useState('');
    const [loading, setLoading] = useState(false);

    async function handlePaste(setter: (value: string) => void) {
        try {
            const text = await navigator.clipboard.readText();
            setter(text);
            message.success('粘贴成功');
        } catch (error: any) {
            console.error('粘贴失败:', error);
            message.error('粘贴失败，请检查剪贴板权限');
        }
    }

    async function handleSign() {
        // if (!contract?.address) {
        //     message.error('请选择合约');
        //     return;
        // };
        
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

    return (
        <Card 
            className={styles.signCard}
            title={
                <Space>
                    <EditOutlined style={{ color: '#1890ff' }} />
                    <Typography.Title level={5} style={{ margin: 0 }}>消息签名</Typography.Title>
                </Space>
            }
        >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div className={styles.inputGroup}>
                    <Typography.Text strong className={styles.label}>待签名消息</Typography.Text>
                    <div className={styles.inputWrapper}>
                        <Input.TextArea
                            value={textToSign}
                            onChange={(e) => setTextToSign(e.target.value)}
                            placeholder="请输入要签名的文本消息"
                            rows={3}
                            className={styles.messageInput}
                        />
                        <div className={styles.buttonGroup}>
                            <Button 
                                icon={<CopyOutlined />} 
                                onClick={() => copyToClip(textToSign)}
                                disabled={!textToSign}
                                className={styles.copyButton}
                            />
                            <Button 
                                icon={<SnippetsOutlined />} 
                                onClick={() => handlePaste(setTextToSign)}
                                className={styles.pasteButton}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.actionGroup}>
                    <Button 
                        type="primary" 
                        size="large"
                        loading={loading} 
                        onClick={handleSign}
                        icon={<EditOutlined />}
                        block
                        className={styles.signButton}
                    >
                        生成签名
                    </Button>
                </div>

                <Divider style={{ margin: '8px 0' }} />
                <div className={styles.inputGroup}>
                    <Typography.Text strong className={styles.label}>签名结果</Typography.Text>
                    <div className={styles.inputWrapper}>
                        <Input.TextArea
                            value={signature}
                            readOnly
                            rows={3}
                            className={styles.signatureInput}
                            placeholder="签名结果将显示在这里"
                        />
                        <div className={styles.buttonGroup}>
                            <Button 
                                icon={<CopyOutlined />} 
                                onClick={() => copyToClip(signature)}
                                disabled={!signature}
                                className={styles.copyButton}
                            />
                            {/* <Button 
                                icon={<SnippetsOutlined />} 
                                onClick={() => handlePaste(setSignature)}
                                className={styles.pasteButton}
                            /> */}
                        </div>
                    </div>
                </div>
            </Space>
        </Card>
    );
}

function Verifier() {
    // const { contract } = useContext(ContractContext);
    const { getWalletProvider, accountInfo } = useWalletContext();
    
    const [textToSign, setTextToSign] = useState('');
    const [signature, setSignature] = useState('');
    const [result, setResult] = useState('');

    async function handlePaste(setter: (value: string) => void) {
        try {
            const text = await navigator.clipboard.readText();
            setter(text);
            message.success('粘贴成功');
        } catch (error: any) {
            console.error('粘贴失败:', error);
            message.error('粘贴失败，请检查剪贴板权限');
        }
    }

    async function handleVerify() {
        // if (!contract?.address) {
        //     message.error('请选择合约');
        //     return;
        // }

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
        <Card 
            className={styles.verifyCard}
            title={
                <Space>
                    <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
                    <Typography.Title level={5} style={{ margin: 0 }}>签名验证</Typography.Title>
                </Space>
            }
        >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div className={styles.inputGroup}>
                    <Typography.Text strong className={styles.label}>原始消息</Typography.Text>
                    <div className={styles.inputWrapper}>
                        <Input.TextArea
                            value={textToSign}
                            onChange={(e) => setTextToSign(e.target.value)}
                            placeholder="请输入原始消息"
                            rows={3}
                            className={styles.messageInput}
                        />
                        <div className={styles.buttonGroup}>
                            <Button 
                                icon={<CopyOutlined />} 
                                onClick={() => copyToClip(textToSign)}
                                disabled={!textToSign}
                                className={styles.copyButton}
                            />
                            <Button 
                                icon={<SnippetsOutlined />} 
                                onClick={() => handlePaste(setTextToSign)}
                                className={styles.pasteButton}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.inputGroup}>
                    <Typography.Text strong className={styles.label}>签名数据</Typography.Text>
                    <div className={styles.inputWrapper}>
                        <Input.TextArea
                            value={signature}
                            onChange={(e) => setSignature(e.target.value)}
                            placeholder="请输入签名数据"
                            rows={3}
                            className={styles.signatureInput}
                        />
                        <div className={styles.buttonGroup}>
                            <Button 
                                icon={<CopyOutlined />} 
                                onClick={() => copyToClip(signature)}
                                disabled={!signature}
                                className={styles.copyButton}
                            />
                            <Button 
                                icon={<SnippetsOutlined />} 
                                onClick={() => handlePaste(setSignature)}
                                className={styles.pasteButton}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.actionGroup}>
                    <Button 
                        type="primary" 
                        size="large"
                        onClick={handleVerify}
                        icon={<SafetyCertificateOutlined />}
                        block
                        className={styles.verifyButton}
                        disabled={!textToSign || !signature}
                    >
                        验证签名
                    </Button>
                </div>

                <Divider style={{ margin: '8px 0' }} />
                <div className={styles.inputGroup}>
                    <Typography.Text strong className={styles.label}>验证结果</Typography.Text>
                    <div className={styles.inputWrapper}>
                        <Input
                            value={result}
                            readOnly
                            className={styles.resultInput}
                            placeholder="验证结果将显示在这里"
                            suffix={
                                <Space size="small">
                                    {isCorrect && (
                                        <Typography.Text 
                                            type={result?.toLowerCase() === accountInfo?.selectedAddress?.toLowerCase() ? 'success' : 'danger'}
                                            strong
                                            style={{ fontSize: '14px' }}
                                        >
                                            {result?.toLowerCase() === accountInfo?.selectedAddress?.toLowerCase() ? '验证通过' : '验证失败'}
                                        </Typography.Text>
                                    )}
                                    {isCorrect}
                                </Space>
                            }
                        />
                        <div className={styles.buttonGroup}>
                            <Button 
                                icon={<CopyOutlined />} 
                                onClick={() => copyToClip(result)}
                                disabled={!result}
                                className={styles.copyButton}
                            />
                            {/* <Button 
                                icon={<SnippetsOutlined />} 
                                onClick={() => handlePaste(setResult)}
                                className={styles.pasteButton}
                            /> */}
                        </div>
                    </div>
                </div>
            </Space>
        </Card>
    );
}