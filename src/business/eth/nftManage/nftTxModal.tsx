import { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Select, Input, Button, Space, Alert, message, Spin } from 'antd';
import { WalletOutlined, SendOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { ethers } from 'ethers';
import fetch from '@/src/fetch';
import { IEthAccount } from '../../../types/IEthAccount';
import { IContract } from '../../../types/IContract';

const { Option } = Select;

// ERC-721 标准转让方法 ABI
const ERC721_TRANSFER_ABI = [
    "function safeTransferFrom(address from, address to, uint256 tokenId) public",
    "function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public",
    "function transferFrom(address from, address to, uint256 tokenId) public",
    "function ownerOf(uint256 tokenId) public view returns (address)",
    "function getApproved(uint256 tokenId) public view returns (address)",
    "function isApprovedForAll(address owner, address operator) public view returns (bool)"
];

interface INFT {
    id?: number;
    contract_id: number;
    contract_address: string;
    token_id: string;
    owner_address: string;
    network_id?: number;
    name?: string;
}

interface NFTTxModalProps {
    visible: boolean;
    nft: INFT | null;
    accountList: IEthAccount[];
    contractList: IContract[];
    networkList: any[];
    onCancel: () => void;
    onSuccess: () => void;
}

export default function NFTTxModal({
    visible,
    nft,
    accountList,
    contractList,
    networkList,
    onCancel,
    onSuccess
}: NFTTxModalProps) {
    const [form] = Form.useForm();
    const [transferring, setTransferring] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<IEthAccount | null>(null);
    const [useExistingAccount, setUseExistingAccount] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [detectingOwner, setDetectingOwner] = useState(false);
    const [detectedOwner, setDetectedOwner] = useState<string | null>(null);
    const [ownerNotFound, setOwnerNotFound] = useState(false);

    // 从链上检测NFT的当前所有者
    const detectNFTOwner = useCallback(async () => {
        if (!nft) return;

        try {
            setDetectingOwner(true);
            setOwnerNotFound(false);

            const contract = contractList.find(c => c.id === nft.contract_id);
            if (!contract) {
                console.error('未找到合约信息');
                setDetectingOwner(false);
                return;
            }

            const network = networkList.find(n => n.id === contract.network_id);
            if (!network) {
                console.error('未找到网络信息');
                setDetectingOwner(false);
                return;
            }

            // 创建只读provider
            const provider = new ethers.JsonRpcProvider(network.rpc_url);
            
            // 解析合约ABI
            let contractAbi;
            try {
                contractAbi = JSON.parse(contract.abi || '[]');
            } catch (e) {
                console.error('合约ABI格式错误');
                setDetectingOwner(false);
                return;
            }

            // 创建合约实例
            const contractInstance = new ethers.Contract(
                contract.address!,
                contractAbi,
                provider
            );

            // 从链上读取当前所有者
            const currentOwner = await contractInstance.ownerOf(nft.token_id);
            const ownerAddress = currentOwner.toLowerCase();
            setDetectedOwner(ownerAddress);

            // 在账户列表中查找匹配的账户（需要有私钥）
            const matchedAccount = accountList.find(acc => 
                acc.private_key && 
                acc.address.toLowerCase() === ownerAddress
            );

            if (matchedAccount) {
                // 找到匹配的账户，自动选中
                setSelectedAccount(matchedAccount);
                form.setFieldsValue({
                    fromAccountId: matchedAccount.id
                });
                message.success('已自动选择NFT所有者账户');
            } else {
                // 未找到匹配的账户
                setOwnerNotFound(true);
                message.warning('NFT所有者不在维护列表内，无法转让');
            }
        } catch (e: any) {
            console.error('检测NFT所有者失败:', e);
            message.error(`检测所有者失败: ${e.message || '未知错误'}`);
            setOwnerNotFound(true);
        } finally {
            setDetectingOwner(false);
        }
    }, [nft, accountList, contractList, networkList, form]);

    // 检测NFT所有者并自动选择账户
    useEffect(() => {
        if (visible && nft) {
            form.resetFields();
            setSelectedAccount(null);
            setUseExistingAccount(false);
            setDetectedOwner(null);
            setOwnerNotFound(false);
            
            // 检测NFT所有者
            detectNFTOwner();
        }
    }, [visible, nft, form, detectNFTOwner]);

    // 验证NFT所有权
    const verifyOwnership = async () => {
        if (!nft || !selectedAccount) {
            message.error('请选择发送账户');
            return;
        }

        try {
            setVerifying(true);
            const contract = contractList.find(c => c.id === nft.contract_id);
            if (!contract) {
                message.error('未找到合约信息');
                return;
            }

            const network = networkList.find(n => n.id === contract.network_id);
            if (!network) {
                message.error('未找到网络信息');
                return;
            }

            const provider = new ethers.JsonRpcProvider(network.rpc_url);
            let contractAbi;
            try {
                contractAbi = JSON.parse(contract.abi || '[]');
            } catch (e) {
                message.error('合约ABI格式错误');
                return;
            }

            const contractInstance = new ethers.Contract(
                contract.address!,
                contractAbi,
                provider
            );

            // 检查当前所有者
            const owner = await contractInstance.ownerOf(nft.token_id);
            if (owner.toLowerCase() !== selectedAccount.address.toLowerCase()) {
                message.warning(`当前所有者是 ${owner}，与选择的账户不匹配`);
                return;
            }

            message.success('所有权验证通过');
        } catch (e: any) {
            console.error('验证所有权失败:', e);
            message.error(`验证失败: ${e.message || '未知错误'}`);
        } finally {
            setVerifying(false);
        }
    };

    // 执行转让
    const handleTransfer = async () => {
        if (!nft) {
            message.error('NFT信息缺失');
            return;
        }

        try {
            const values = await form.validateFields();
            setTransferring(true);

            const contract = contractList.find(c => c.id === nft.contract_id);
            if (!contract) {
                message.error('未找到合约信息');
                return;
            }

            if (!selectedAccount || !selectedAccount.private_key) {
                message.error('请选择有私钥的账户');
                return;
            }

            const network = networkList.find(n => n.id === contract.network_id);
            if (!network) {
                message.error('未找到网络信息');
                return;
            }

            // 创建provider和wallet
            const provider = new ethers.JsonRpcProvider(network.rpc_url);
            const wallet = new ethers.Wallet(selectedAccount.private_key, provider);

            // 解析合约ABI
            let contractAbi;
            try {
                contractAbi = JSON.parse(contract.abi || '[]');
            } catch (e) {
                message.error('合约ABI格式错误');
                setTransferring(false);
                return;
            }

            // 创建合约实例
            const contractInstance = new ethers.Contract(
                contract.address!,
                contractAbi,
                wallet
            );

            // 验证接收地址
            if (!ethers.isAddress(values.toAddress)) {
                message.error('无效的接收地址');
                setTransferring(false);
                return;
            }

            // 验证当前所有者
            try {
                const currentOwner = await contractInstance.ownerOf(nft.token_id);
                if (currentOwner.toLowerCase() !== selectedAccount.address.toLowerCase()) {
                    message.error(`当前所有者是 ${currentOwner}，与选择的账户不匹配`);
                    setTransferring(false);
                    return;
                }
            } catch (e: any) {
                console.warn('无法验证所有者，继续执行:', e);
            }

            message.loading({ content: '正在执行转让...', key: 'transfer' });

            // 检查合约是否支持 safeTransferFrom 或 transferFrom
            const hasSafeTransferFrom = contractAbi.some((item: any) =>
                item.type === 'function' && item.name === 'safeTransferFrom'
            );
            const hasTransferFrom = contractAbi.some((item: any) =>
                item.type === 'function' && item.name === 'transferFrom'
            );

            let tx;
            if (hasSafeTransferFrom) {
                // 优先使用 safeTransferFrom（更安全）
                try {
                    tx = await contractInstance.safeTransferFrom(
                        selectedAccount.address,
                        values.toAddress,
                        nft.token_id
                    );
                } catch (e: any) {
                    // 如果失败，尝试带 data 参数的版本
                    if (e.message && e.message.includes('overloads')) {
                        tx = await contractInstance.safeTransferFrom(
                            selectedAccount.address,
                            values.toAddress,
                            nft.token_id,
                            '0x'
                        );
                    } else {
                        throw e;
                    }
                }
            } else if (hasTransferFrom) {
                // 使用 transferFrom
                tx = await contractInstance.transferFrom(
                    selectedAccount.address,
                    values.toAddress,
                    nft.token_id
                );
            } else {
                throw new Error('合约不支持转让方法（safeTransferFrom 或 transferFrom）');
            }

            // 等待交易确认
            const receipt = await tx.wait();

            // 更新数据库中的所有者地址
            try {
                await fetch.put('/api/eth/nft', {
                    id: nft.id,
                    owner_address: values.toAddress
                });
            } catch (e: any) {
                console.error('更新数据库失败:', e);
                message.warning('转让成功，但更新数据库失败，请手动更新');
            }

            message.success({ 
                content: `转让成功！交易哈希: ${tx.hash}`, 
                key: 'transfer',
                duration: 5
            });

            onSuccess();
            onCancel();
        } catch (e: any) {
            console.error('转让失败:', e);
            let errorMsg = '转让失败';
            if (e.reason) {
                errorMsg = e.reason;
            } else if (e.message) {
                errorMsg = e.message;
            }
            message.error({ content: errorMsg, key: 'transfer', duration: 5 });
        } finally {
            setTransferring(false);
        }
    };

    if (!nft) {
        return null;
    }

    const contract = contractList.find(c => c.id === nft.contract_id);

    return (
        <Modal
            title={
                <Space>
                    <SendOutlined />
                    NFT转让
                </Space>
            }
            open={visible}
            onCancel={onCancel}
            width={600}
            footer={[
                <Button key="cancel" onClick={onCancel}>
                    取消
                </Button>,
                <Button
                    key="verify"
                    onClick={verifyOwnership}
                    loading={verifying}
                    disabled={!selectedAccount || ownerNotFound}
                >
                    验证所有权
                </Button>,
                <Button
                    key="transfer"
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleTransfer}
                    loading={transferring}
                    disabled={!selectedAccount || ownerNotFound}
                >
                    确认转让
                </Button>
            ]}
        >
            <Form form={form} layout="vertical">
                <Alert
                    message="转让说明"
                    description="将NFT从当前所有者转移到指定地址。系统会自动检测NFT的当前所有者并选择对应账户。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                {detectingOwner && (
                    <Alert
                        message="正在检测NFT所有者..."
                        description="正在从链上读取NFT的当前所有者信息"
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                        icon={<Spin size="small" />}
                    />
                )}

                {ownerNotFound && detectedOwner && (
                    <Alert
                        message="无法转让"
                        description={
                            <div>
                                <p>NFT所有者地址: <code>{detectedOwner}</code></p>
                                <p>该地址不在维护的账户列表内，无法执行转让操作。</p>
                                <p>请先将该地址添加到账户管理中，并确保账户有私钥。</p>
                            </div>
                        }
                        type="error"
                        showIcon
                        icon={<ExclamationCircleOutlined />}
                        style={{ marginBottom: 16 }}
                    />
                )}

                <Form.Item label="NFT信息">
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                            <strong>名称：</strong>
                            {nft.name || `Token #${nft.token_id}`}
                        </div>
                        <div>
                            <strong>Token ID：</strong>
                            <code>{nft.token_id}</code>
                        </div>
                        <div>
                            <strong>合约地址：</strong>
                            <code>{nft.contract_address}</code>
                        </div>
                        {contract && (
                            <div>
                                <strong>合约名称：</strong>
                                {contract.name}
                            </div>
                        )}
                        <div>
                            <strong>数据库中的所有者：</strong>
                            <code>{nft.owner_address}</code>
                        </div>
                        {detectedOwner && (
                            <div>
                                <strong>链上检测到的所有者：</strong>
                                <code>{detectedOwner}</code>
                            </div>
                        )}
                    </Space>
                </Form.Item>

                <Form.Item
                    name="fromAccountId"
                    label="发送账户"
                    rules={[{ required: true, message: '请选择发送账户' }]}
                    tooltip="必须是NFT的当前所有者，且需要有私钥。系统会自动检测并选择。"
                >
                    <Select
                        placeholder={detectingOwner ? "正在检测所有者..." : "请选择发送账户（需要有私钥）"}
                        onChange={(value) => {
                            const account = accountList.find(a => a.id === value);
                            setSelectedAccount(account || null);
                        }}
                        showSearch
                        optionFilterProp="children"
                        disabled={ownerNotFound || detectingOwner}
                        loading={detectingOwner}
                    >
                        {accountList
                            .filter(acc => acc.private_key)
                            .map(account => (
                                <Option key={account.id} value={account.id}>
                                    <Space>
                                        <WalletOutlined />
                                        {account.name}
                                        <code style={{ fontSize: 12 }}>
                                            ({account.address.substring(0, 8)}...{account.address.substring(account.address.length - 6)})
                                        </code>
                                        {detectedOwner && account.address.toLowerCase() === detectedOwner && (
                                            <span style={{ color: '#52c41a', fontSize: 12 }}>(当前所有者)</span>
                                        )}
                                    </Space>
                                </Option>
                            ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    label={
                        <Space>
                            <span>接收地址</span>
                            <Button
                                type="link"
                                size="small"
                                onClick={() => {
                                    setUseExistingAccount(!useExistingAccount);
                                    form.setFieldValue('toAddress', undefined);
                                }}
                            >
                                {useExistingAccount ? '手动输入' : '选择已有账户'}
                            </Button>
                        </Space>
                    }
                    tooltip="NFT将被转移到此地址"
                >
                    <Form.Item
                        name="toAddress"
                        noStyle
                        rules={[
                            { required: true, message: useExistingAccount ? '请选择接收地址' : '请输入接收地址' },
                            ...(!useExistingAccount ? [{ 
                                pattern: /^0x[a-fA-F0-9]{40}$/, 
                                message: '请输入有效的以太坊地址' 
                            }] : [])
                        ]}
                    >
                        {useExistingAccount ? (
                            <Select
                                placeholder="请选择已有账户地址"
                                showSearch
                                optionFilterProp="children"
                            >
                                {accountList.map(account => (
                                    <Option key={account.id} value={account.address}>
                                        <Space>
                                            <WalletOutlined />
                                            {account.name}
                                            <code style={{ fontSize: 12 }}>
                                                ({account.address.substring(0, 8)}...{account.address.substring(account.address.length - 6)})
                                            </code>
                                        </Space>
                                    </Option>
                                ))}
                            </Select>
                        ) : (
                            <Input
                                placeholder="0x..."
                                prefix={<WalletOutlined />}
                            />
                        )}
                    </Form.Item>
                </Form.Item>

                {selectedAccount && (
                    <Alert
                        message="提示"
                        description={
                            <div>
                                <p>发送账户: <code>{selectedAccount.address}</code></p>
                                <p>请确保此账户是NFT的当前所有者，否则转让将失败。</p>
                            </div>
                        }
                        type="warning"
                        showIcon
                    />
                )}
            </Form>
        </Modal>
    );
}

