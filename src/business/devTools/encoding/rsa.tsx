import { Divider, Input, Button, Space, message } from "antd";
import { useState } from "react";
import fetch from '@/src/fetch';
import NodeRSA from "node-rsa";
import copyToClip from "@/src/utils/common/copy";

export default function() {
    let [pubKey, setPubKey] = useState('');
    let [priKey, setPriKey] = useState('');
    let [pending, setPending] = useState(false);
    let [srcText, setSrcText] = useState('');
    let [secret, setSecret] = useState('');

    const labelStyle = {
        width: '4em'
    }

    async function generateKeyPair() {
        
        try {
            setPending(true);

            let data: any = await fetch.get('/api/devTools/rsa/keyPair');
            let { publicKey, privateKey } = data;
            setPubKey(publicKey);
            setPriKey(privateKey);
        } catch(e) {
            console.error(e);
        } finally {
            setPending(false);
        }
    }

    function doEncrypt() {
        try {
            let cipher = new NodeRSA(
                pubKey, 
                'pkcs1-public-pem', 
                {
                    encryptionScheme: 'pkcs1'
                }
            );
            setSecret(cipher.encrypt(srcText, 'base64'));
        } catch(e: any) {
            message.error(e.message);
        }
    }

    function doDecrypt() {
        try {
            let cipher = new NodeRSA(
                priKey, 
                'pkcs1-private-pem',
                {
                    encryptionScheme: 'pkcs1'
                }
            );
            setSrcText(cipher.decrypt(secret, 'utf8'));
        } catch(e: any) {
            message.error(e.message);
        }
    }

    function doCopy(payload: string, hint: string) {
        copyToClip(payload);
        message.success(hint);
    }

    return (
        <div>
            <Divider orientation="left">
                <span>RSA密钥对</span>
                <Button 
                    type="link" 
                    onClick={generateKeyPair}
                    loading={pending}
                >&gt;&gt;&nbsp;自动生成</Button>
            </Divider>
            <table className="f-fit-width">
                <tr>
                    <td style={labelStyle}>公钥：</td>
                    <td>
                        <Input.TextArea 
                            rows={7}
                            disabled={pending}
                            value={pubKey} 
                            onInput={e => setPubKey((e.target as HTMLInputElement).value)}
                        ></Input.TextArea>
                        <Button type="link"
                            disabled={!pubKey}
                            onClick={() => doCopy(pubKey, '已复制公钥')}
                        >&gt;&gt;&nbsp;复制</Button>
                    </td>
                    <td style={labelStyle}>私钥：</td>
                    <td>
                        <Input.TextArea 
                            rows={7}
                            disabled={pending}
                            value={priKey}
                            onInput={e => setPriKey((e.target as HTMLInputElement).value)}
                        ></Input.TextArea>
                        <Button type="link"
                            disabled={!priKey}
                            onClick={() => doCopy(priKey, '已复制私钥')}
                        >&gt;&gt;&nbsp;复制</Button>
                    </td>
                </tr>
            </table>

            <Divider orientation="left">RSA加解密</Divider>

            <table className="f-fit-width">
                <tr>
                    <td style={labelStyle}>原文：</td>
                    <td>
                        <Input.TextArea 
                            rows={7}
                            value={srcText}
                            onInput={e => setSrcText((e.target as HTMLInputElement).value)}
                        ></Input.TextArea>
                    </td>
                </tr>
                <tr>
                    <td style={labelStyle}></td>
                    <td>
                        <Space>
                            <Button
                                disabled={pending || !pubKey}
                                onClick={doEncrypt}
                            >⬇️加密⬇️</Button>
                            <Button
                                disabled={pending || !priKey}
                                onClick={doDecrypt}
                            >⬆️解密⬆️</Button>
                        </Space>
                    </td>
                </tr>
                <tr>
                    <td style={labelStyle}>密文：</td>
                    <td>
                        <Input.TextArea 
                            rows={7}
                            value={secret}
                            onInput={e => setSecret((e.target as HTMLInputElement).value)}
                        ></Input.TextArea>
                    </td>
                </tr>
            </table>
        </div>
    )
}