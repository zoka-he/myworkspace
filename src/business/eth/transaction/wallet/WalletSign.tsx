import { IContract } from "@/src/types/IContract";
import { Button, Input, message, Space, Typography, Card, Divider, Row, Col } from "antd";
import { useState, useEffect, createContext } from "react";
import { ethers } from "ethers";
import { useWalletContext } from "../WalletContext";
import { CheckOutlined, CloseOutlined, CopyOutlined, EditOutlined, SafetyCertificateOutlined, SnippetsOutlined } from "@ant-design/icons";
import copyToClip from "@/src/utils/common/copy";
import styles from './WalletSign.module.scss';
import { useConnection, useEnsAddress, useSignMessage } from "wagmi";

export default function WalletSign() {


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


function Signer() {
    // const { getWalletProvider, accountInfo } = useWalletContext();
    const [textToSign, setTextToSign] = useState('');
    const [signature, setSignature] = useState('');
    const [loading, setLoading] = useState(false);

    const connection = useConnection();
    const signMessage = useSignMessage();

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
        
        if (!connection.isConnected) {
            message.error('请连接钱包');
            return;
        }
        
        // const walletProvider = getWalletProvider();
        if (!connection.connector) {
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

            // 添加超时处理
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('签名超时，请检查钱包扩展是否响应')), 60000); // 60秒超时
            });
            
            

            const result = await signMessage.mutateAsync({
                message: textToSign,
            });
            
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
    // const { getWalletProvider, accountInfo } = useWalletContext();
    const connection = useConnection();
    const account = connection.address;
    
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

        if (!connection.isConnected || !connection.connector) {
            message.error('请连接钱包');
            return;
        }

        if (!signature) {
            message.error('请输入签名');
            return;
        }

        if (!textToSign) {
            message.error('请输入原始消息');
            return;
        }

        const result = await ethers.verifyMessage(textToSign, signature);
        setResult(result);
    }

    let isCorrect = null;
    if (result) {
        isCorrect = result?.toLowerCase() === account?.toLowerCase();
        console.log('isCorrect', isCorrect);
        console.log('result', result);
        console.log('account', account);
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
                                            type={isCorrect ? 'success' : 'danger'}
                                            strong
                                            style={{ fontSize: '14px' }}
                                        >
                                            { isCorrect ? '验证通过' : '验证失败'}
                                        </Typography.Text>
                                    )}
                                    {isCorrect ? <CheckOutlined/> : <CloseOutlined/> }
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