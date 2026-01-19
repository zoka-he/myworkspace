import { Alert, Button, Col, Descriptions, Divider, Form, Input, message, Modal, Row, Select, Space, Tag, Typography } from "antd";
import { InteractionOutlined } from '@ant-design/icons';
import styles from './index.module.scss';
import { IContract, IContractCallResult, IContractMethod } from "@/src/types/IContract";
import { ethers } from "ethers";
import { useCallback, useEffect, useState } from "react";
import { IEthAccount } from "@/src/types/IEthAccount";
import fetch from "@/src/fetch";
import { useWalletContext, WalletProvider } from "../../transaction/WalletContext";
import WalletInfo from "./walletInfo";
import ContextStarter from "./contextStarter";
import ContractInfo from "./contractInfo";

const { Text } = Typography;    
const { Option } = Select;

interface IContractTestModalProps {
    isOpen: boolean;
    accountList: IEthAccount[];
    onCancel: () => void;
    currentContract: IContract | null;
}

export default function ContractTestModal(props: IContractTestModalProps) {

    const [selectedMethod, setSelectedMethod] = useState<IContractMethod | null>(null);

    useEffect(() => {
        setSelectedMethod(null);
    }, [props.currentContract]);

    function handleSelectMethodFromContractInfo(method: IContractMethod) {
        setSelectedMethod(method);
        
        // 让 Modal 的位置回到视口顶部
        requestAnimationFrame(() => {
            setTimeout(() => {
                let modalWrap: HTMLElement | null = null;
                
                // 方法1: 通过 CSS 模块类名查找（如果类名没有被转换）
                const modalWithClass = document.querySelector(`.${styles.ContractInteractionModal}`);
                if (modalWithClass) {
                    modalWrap = modalWithClass.closest('.ant-modal-wrap') as HTMLElement;
                }
                
                // 方法2: 如果方法1失败，通过 Modal 标题查找（最可靠的方法）
                if (!modalWrap) {
                    const allModalWraps = document.querySelectorAll('.ant-modal-wrap');
                    Array.from(allModalWraps).forEach((wrap) => {
                        const title = wrap.querySelector('.ant-modal-title');
                        if (title && title.textContent?.includes('合约交互')) {
                            modalWrap = wrap as HTMLElement;
                        }
                    });
                }
                
                // 方法3: 如果还是找不到，查找最后一个可见的 Modal
                if (!modalWrap) {
                    const allModalWraps = document.querySelectorAll('.ant-modal-wrap');
                    // 查找可见的 Modal（display 不为 none）
                    Array.from(allModalWraps).forEach((wrap) => {
                        const style = window.getComputedStyle(wrap);
                        if (style.display !== 'none' && style.visibility !== 'hidden' && !modalWrap) {
                            modalWrap = wrap as HTMLElement;
                        }
                    });
                }
                
                if (modalWrap) {
                    console.debug('找到 modalWrap -------->', modalWrap);
                    console.debug('当前 window.scrollY:', window.scrollY);
                    console.debug('当前 document.documentElement.scrollTop:', document.documentElement.scrollTop);
                    console.debug('当前 document.body.scrollTop:', document.body.scrollTop);
                    
                    // 优先处理 modalWrap 的滚动（这是主要的滚动容器）
                    const currentModalWrap = modalWrap; // 保存引用避免闭包问题
                    if (currentModalWrap.scrollTop > 0) {
                        console.debug('优先滚动 modalWrap 到顶部，从', currentModalWrap.scrollTop, '到 0');
                        currentModalWrap.scrollTop = 0;
                        if (typeof currentModalWrap.scrollTo === 'function') {
                            currentModalWrap.scrollTo({ top: 0, behavior: 'instant' });
                        }
                        // 使用 requestAnimationFrame 确保生效
                        requestAnimationFrame(() => {
                            if (currentModalWrap) {
                                currentModalWrap.scrollTop = 0;
                            }
                        });
                    }
                    
                    // 查找 Modal 内部的所有可能的滚动容器
                    const modalBody = modalWrap.querySelector('.ant-modal-body') as HTMLElement;
                    const modalContent = modalWrap.querySelector('.ant-modal-content') as HTMLElement;
                    const modal = modalWrap.querySelector('.ant-modal') as HTMLElement;
                    
                    // 查找 Modal 内部所有可滚动的元素
                    const allScrollableElements = modalWrap.querySelectorAll('*');
                    const scrollContainers: HTMLElement[] = [
                        document.documentElement,
                        document.body,
                        modalWrap,
                    ];
                    
                    // 添加 Modal 内部可能的滚动容器
                    if (modalBody) scrollContainers.push(modalBody);
                    if (modalContent) scrollContainers.push(modalContent);
                    if (modal) scrollContainers.push(modal);
                    
                    // 检查所有元素，查找可滚动的
                    allScrollableElements.forEach((el) => {
                        const htmlEl = el as HTMLElement;
                        try {
                            const style = window.getComputedStyle(htmlEl);
                            const overflow = style.overflow;
                            const overflowY = style.overflowY;
                            const scrollTop = htmlEl.scrollTop;
                            
                            // 如果元素有滚动能力（overflow 为 auto/scroll）或者 scrollTop 不为 0
                            if ((overflow === 'auto' || overflow === 'scroll' || overflowY === 'auto' || overflowY === 'scroll' || scrollTop > 0) && scrollTop > 0) {
                                console.debug('找到可滚动元素:', htmlEl.tagName, htmlEl.className, 'scrollTop:', scrollTop);
                                scrollContainers.push(htmlEl);
                            }
                        } catch (e) {
                            // 忽略错误
                        }
                    });
                    
                    // 向上查找所有父容器
                    let parent: HTMLElement | null = modalWrap.parentElement;
                    while (parent && parent !== document.body && parent !== document.documentElement) {
                        scrollContainers.push(parent);
                        parent = parent.parentElement;
                    }
                    
                    // 滚动所有可能的容器
                    scrollContainers.forEach((container) => {
                        try {
                            const style = window.getComputedStyle(container);
                            const overflow = style.overflow;
                            const overflowY = style.overflowY;
                            const scrollTop = container.scrollTop;
                            const scrollHeight = container.scrollHeight;
                            const clientHeight = container.clientHeight;
                            
                            console.debug('检查容器:', container.tagName, container.className, 'overflow:', overflow, 'overflowY:', overflowY, 'scrollTop:', scrollTop, 'scrollHeight:', scrollHeight, 'clientHeight:', clientHeight);
                            
                            // 如果 scrollTop > 0 或者可以滚动（scrollHeight > clientHeight）
                            if (scrollTop > 0 || (scrollHeight > clientHeight && (overflow === 'auto' || overflow === 'scroll' || overflowY === 'auto' || overflowY === 'scroll'))) {
                                console.debug('滚动容器到顶部:', container, '从', scrollTop, '到 0');
                                // 使用多种方法确保滚动生效
                                container.scrollTop = 0;
                                // 如果支持 scrollTo，也使用它
                                if (typeof container.scrollTo === 'function') {
                                    container.scrollTo({ top: 0, behavior: 'instant' });
                                }
                                // 再次设置确保生效
                                requestAnimationFrame(() => {
                                    container.scrollTop = 0;
                                });
                            }
                        } catch (e) {
                            console.debug('滚动容器时出错:', e);
                        }
                    });
                    
                    // 强制滚动 window 和 document 到顶部（立即，不使用 smooth）
                    window.scrollTo(0, 0);
                    document.documentElement.scrollTop = 0;
                    document.body.scrollTop = 0;
                    
                    // 再次检查是否成功滚动
                    const finalModalWrap = modalWrap; // 保存引用避免闭包问题
                    setTimeout(() => {
                        console.debug('滚动后 window.scrollY:', window.scrollY);
                        console.debug('滚动后 document.documentElement.scrollTop:', document.documentElement.scrollTop);
                        console.debug('滚动后 document.body.scrollTop:', document.body.scrollTop);
                        if (finalModalWrap) {
                            console.debug('滚动后 modalWrap.scrollTop:', finalModalWrap.scrollTop);
                        }
                        if (modalBody) console.debug('滚动后 modalBody.scrollTop:', modalBody.scrollTop);
                        if (modalContent) console.debug('滚动后 modalContent.scrollTop:', modalContent.scrollTop);
                        if (modal) console.debug('滚动后 modal.scrollTop:', modal.scrollTop);
                        
                        // 如果 modalWrap 的 scrollTop 仍然不为 0，强制再次滚动
                        if (finalModalWrap && finalModalWrap.scrollTop > 0) {
                            console.debug('检测到 modalWrap.scrollTop 仍不为 0，强制滚动');
                            finalModalWrap.scrollTop = 0;
                            if (typeof finalModalWrap.scrollTo === 'function') {
                                finalModalWrap.scrollTo({ top: 0, behavior: 'instant' });
                            }
                        }
                    }, 50);
                } else {
                    console.debug('未找到 modalWrap，尝试滚动 window');
                    // 如果找不到 Modal，直接滚动 window 到顶部
                    window.scrollTo(0, 0);
                    document.documentElement.scrollTop = 0;
                    document.body.scrollTop = 0;
                }
            }, 100);
        });
    }

    return <Modal
        title={<Space><InteractionOutlined />合约交互</Space>}
        open={props.isOpen}
        onCancel={props.onCancel}
        width={'70vw'}
        footer={null}
        className={styles.ContractInteractionModal}
    >
        <WalletProvider>

            <ContextStarter modalStatus={props.isOpen} />
            <Row gutter={[16, 16]}>
                <Col span={8}>
                    <Space direction="vertical" size={16}>
                        <WalletInfo />
                        <ContractInfo contract={props.currentContract} onMethodClick={handleSelectMethodFromContractInfo} />
                    </Space>
                </Col>
                <Col span={16}>
                    <ContractInteraction accountList={props.accountList} currentContract={props.currentContract} selectedMethod={selectedMethod} onMethodClick={setSelectedMethod} />
                </Col>
            </Row>
        </WalletProvider>
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

// 将字符串参数转换为合约方法所需的正确类型
function convertParamToType(value: string, type: string): any {
    if (!value || value.trim() === '') {
        throw new Error(`参数值不能为空`);
    }

    const trimmedValue = value.trim();

    // 处理数组类型 (uint256[], address[], 等)
    if (type.endsWith('[]')) {
        try {
            const arr = JSON.parse(trimmedValue);
            if (!Array.isArray(arr)) {
                throw new Error(`参数类型 ${type} 需要数组格式，例如: [1, 2, 3]`);
            }
            const baseType = type.slice(0, -2);
            return arr.map((item: any) => convertParamToType(String(item), baseType));
        } catch (e) {
            throw new Error(`参数类型 ${type} 需要有效的 JSON 数组格式`);
        }
    }

    // 处理固定大小数组 (uint256[3], address[2], 等)
    const fixedArrayMatch = type.match(/^(.+)\[(\d+)\]$/);
    if (fixedArrayMatch) {
        try {
            const arr = JSON.parse(trimmedValue);
            if (!Array.isArray(arr)) {
                throw new Error(`参数类型 ${type} 需要数组格式`);
            }
            const baseType = fixedArrayMatch[1];
            const size = parseInt(fixedArrayMatch[2]);
            if (arr.length !== size) {
                throw new Error(`参数类型 ${type} 需要长度为 ${size} 的数组`);
            }
            return arr.map((item: any) => convertParamToType(String(item), baseType));
        } catch (e) {
            throw new Error(`参数类型 ${type} 需要有效的 JSON 数组格式`);
        }
    }

    // 处理 uint 类型 (uint8, uint256, 等)
    if (type.startsWith('uint')) {
        try {
            // 支持十六进制 (0x...) 和十进制
            if (trimmedValue.startsWith('0x')) {
                return BigInt(trimmedValue);
            }
            return BigInt(trimmedValue);
        } catch (e) {
            throw new Error(`参数类型 ${type} 需要有效的数字，当前值: ${trimmedValue}`);
        }
    }

    // 处理 int 类型 (int8, int256, 等)
    if (type.startsWith('int')) {
        try {
            if (trimmedValue.startsWith('0x')) {
                return BigInt(trimmedValue);
            }
            return BigInt(trimmedValue);
        } catch (e) {
            throw new Error(`参数类型 ${type} 需要有效的数字，当前值: ${trimmedValue}`);
        }
    }

    // 处理 bool 类型
    if (type === 'bool') {
        const lowerValue = trimmedValue.toLowerCase();
        if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
            return true;
        }
        if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
            return false;
        }
        throw new Error(`参数类型 bool 需要 true/false，当前值: ${trimmedValue}`);
    }

    // 处理 address 类型
    if (type === 'address') {
        try {
            // ethers.js 会验证地址格式
            if (!ethers.isAddress(trimmedValue)) {
                throw new Error(`无效的地址格式: ${trimmedValue}`);
            }
            return trimmedValue;
        } catch (e: any) {
            throw new Error(`参数类型 address 需要有效的以太坊地址，当前值: ${trimmedValue}`);
        }
    }

    // 处理 bytes 类型 (bytes, bytes32, 等)
    if (type.startsWith('bytes')) {
        // 如果以 0x 开头，直接使用
        if (trimmedValue.startsWith('0x')) {
            try {
                return trimmedValue;
            } catch (e) {
                throw new Error(`参数类型 ${type} 需要有效的十六进制字符串，当前值: ${trimmedValue}`);
            }
        }
        // 否则转换为十六进制
        try {
            return ethers.hexlify(ethers.toUtf8Bytes(trimmedValue));
        } catch (e) {
            throw new Error(`参数类型 ${type} 需要有效的字符串或十六进制，当前值: ${trimmedValue}`);
        }
    }

    // 处理 string 类型
    if (type === 'string') {
        return trimmedValue;
    }

    // 处理 tuple 类型（简单处理，实际可能需要递归）
    if (type.startsWith('tuple')) {
        try {
            return JSON.parse(trimmedValue);
        } catch (e) {
            throw new Error(`参数类型 ${type} 需要有效的 JSON 对象格式`);
        }
    }

    // 默认返回原值（让 ethers.js 处理）
    return trimmedValue;
}

// 常见错误的友好解释映射
const ERROR_EXPLANATIONS: Record<string, string> = {
    'ReentrancyGuardReentrantCall': '重入保护：检测到重入调用。合约正在执行中，不允许重复调用。这通常发生在合约方法被递归调用时。',
    'OwnableUnauthorizedAccount': '权限错误：当前账户不是合约所有者，无法执行此操作。请使用合约所有者账户。',
    'OwnableInvalidOwner': '所有者错误：无效的所有者地址。',
    'ERC721InsufficientApproval': 'ERC721 授权不足：当前账户没有足够的授权来执行此操作。',
    'ERC721InvalidTokenId': 'ERC721 无效 Token ID：提供的 Token ID 不存在或无效。',
    'ERC721IncorrectOwner': 'ERC721 所有者错误：当前账户不是该 Token 的所有者。',
    'ERC20InsufficientBalance': 'ERC20 余额不足：账户余额不足以完成此操作。',
    'ERC20InsufficientAllowance': 'ERC20 授权不足：授权额度不足以完成此操作。',
    'PausableEnforcedPause': '合约已暂停：合约当前处于暂停状态，无法执行此操作。',
    'PausableExpectedPause': '合约未暂停：合约当前未处于暂停状态。',
    'AccessControlBadConfirmation': '访问控制确认错误：确认码不匹配。',
    'AccessControlUnauthorizedAccount': '访问控制权限错误：当前账户没有执行此操作的权限。',
    'AccessControlInvalidAccount': '访问控制账户错误：无效的账户地址。',
    'StringsInsufficientHexLength': '字符串错误：十六进制字符串长度不足。',
    'SafeERC20FailedOperation': 'SafeERC20 操作失败：ERC20 代币操作失败。',
    'AddressEmptyCode': '地址错误：目标地址没有代码（可能是 EOA 或未部署的合约）。',
    'AddressInsufficientBalance': '地址余额不足：目标地址余额不足以完成此操作。',
    'FailedInnerCall': '内部调用失败：合约内部调用失败。',
    'MathOverflowedMulDiv': '数学运算溢出：乘法或除法运算结果溢出。',
    'MathOverflowedAddSub': '数学运算溢出：加法或减法运算结果溢出。',
    'Panic': '运行时错误：发生了运行时异常。',
};

// 解析 Solidity revert 错误
function parseRevertError(error: any, abi?: any[]): string {
    // 如果错误有 reason 字段，直接使用
    if (error.reason) {
        return error.reason;
    }

    // 提取错误数据
    let errorData: string | null = null;
    if (error.data) {
        errorData = typeof error.data === 'string' ? error.data : null;
    }

    // 如果有错误数据，尝试解析自定义错误
    if (errorData && errorData.startsWith('0x') && errorData.length >= 10) {
        const selector = errorData.slice(0, 10);
        const data = errorData.slice(10);

        // Error(string) 的选择器是 0x08c379a0
        if (selector === '0x08c379a0') {
            try {
                // 解码标准 Error(string) 错误
                if (data.length >= 64) {
                    // 跳过偏移量（前32字节），读取长度（接下来32字节），然后是字符串数据
                    const offsetHex = data.slice(0, 64);
                    const offset = parseInt(offsetHex, 16);
                    const lengthHex = data.slice(64, 128);
                    const length = parseInt(lengthHex, 16);
                    
                    if (length > 0 && data.length >= 128 + length * 2) {
                        const stringData = data.slice(128, 128 + length * 2);
                        const decoded = ethers.toUtf8String('0x' + stringData);
                        return decoded;
                    }
                }
            } catch (e) {
                console.warn('解码 Error(string) 失败:', e);
            }
        }

        // 尝试从 ABI 中查找自定义错误
        if (abi && Array.isArray(abi)) {
            try {
                // 查找所有 error 定义
                const errors = abi.filter((item: any) => item.type === 'error');
                
                for (const errorDef of errors) {
                    // 计算错误选择器
                    // 格式: ErrorName(param1Type,param2Type,...)
                    const paramTypes = errorDef.inputs?.map((input: any) => input.type).join(',') || '';
                    const errorSignature = `${errorDef.name}(${paramTypes})`;
                    const calculatedSelector = ethers.id(errorSignature).slice(0, 10);
                    
                    if (calculatedSelector.toLowerCase() === selector.toLowerCase()) {
                        // 找到匹配的错误定义
                        let errorMessage = errorDef.name;
                        
                        // 如果有参数，尝试解码
                        if (errorDef.inputs && errorDef.inputs.length > 0 && data.length > 0) {
                            try {
                                const paramTypes = errorDef.inputs.map((input: any) => input.type);
                                // 确保数据长度足够（每个参数至少32字节）
                                const minDataLength = paramTypes.length * 64;
                                if (data.length >= minDataLength) {
                                    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                                        paramTypes,
                                        '0x' + data
                                    );
                                    
                                    // 格式化参数
                                    const params = errorDef.inputs.map((input: any, index: number) => {
                                        let value = decoded[index];
                                        if (typeof value === 'bigint') {
                                            value = value.toString();
                                        }
                                        return `${input.name || `param${index}`}=${value}`;
                                    }).join(', ');
                                    
                                    errorMessage += `(${params})`;
                                }
                            } catch (decodeError) {
                                console.warn('解码自定义错误参数失败:', decodeError);
                                errorMessage += ` (参数解码失败)`;
                            }
                        }
                        
                        // 查找是否有友好解释
                        const explanation = ERROR_EXPLANATIONS[errorDef.name];
                        if (explanation) {
                            return `${errorMessage}\n\n${explanation}`;
                        }
                        
                        return errorMessage;
                    }
                }
            } catch (e) {
                console.warn('解析自定义错误失败:', e);
            }
        }

        // 如果无法解析，返回选择器
        return `合约执行回退 (自定义错误选择器: ${selector})`;
    }

    // 如果错误有 message 字段
    if (error.message) {
        // 检查是否是 "(unknown custom error)" 的情况
        // 这种情况下，errorData 应该已经在上面的逻辑中处理过了
        // 但如果 errorData 为空或无法解析，这里作为后备
        if (error.message.includes('unknown custom error')) {
            if (errorData && errorData.length >= 10) {
                // 如果已经有 errorData，应该已经在上面的逻辑中处理了
                // 这里只是作为后备，返回选择器
                return `合约执行回退 (自定义错误选择器: ${errorData.slice(0, 10)})`;
            }
            return '合约执行回退 (未知自定义错误)';
        }
        
        // 尝试从 message 中提取 revert 原因
        const revertMatch = error.message.match(/execution reverted:?\s*(.+)/i);
        if (revertMatch) {
            return revertMatch[1];
        }
        
        return error.message;
    }

    // 如果有 data 字段但无法解析
    if (errorData) {
        return `合约执行回退: ${errorData}`;
    }

    // 默认错误消息
    return '合约执行回退，请检查参数是否正确或合约状态是否允许此操作';
}

interface IContractInteractionProps {
    accountList: IEthAccount[];
    currentContract: IContract | null;
    selectedMethod: IContractMethod | null;
    onMethodClick: (method: IContractMethod) => void;
}

// 渲染合约交互界面
function ContractInteraction(props: IContractInteractionProps) {

    const [interactForm] = Form.useForm();
    const { accountInfo, getWalletProvider } = useWalletContext();
    const [callResult, setCallResult] = useState<IContractCallResult | null>(null);

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


    useEffect(() => {
        if (props.selectedMethod) {
            interactForm.setFieldValue('method', props.selectedMethod.name);
        } else {
            interactForm.resetFields(['method']);
        }
    }, [props.selectedMethod]);

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
            
            // 准备参数并转换类型
            let params: any[];
            try {
                params = method.inputs.map((input: any) => {
                    const paramValue = values[`param_${input.name}`];
                    if (paramValue === undefined || paramValue === null) {
                        throw new Error(`参数 ${input.name} 不能为空`);
                    }
                    return convertParamToType(String(paramValue), input.type);
                });
            } catch (paramError: any) {
                console.error('参数转换失败:', paramError);
                message.error({ 
                    content: `参数转换失败: ${paramError.message}`, 
                    key: 'call',
                    duration: 5
                });
                return;
            }

            // 检查方法是否是 payable，并处理 ETH 金额
            const isPayable = method.stateMutability === 'payable';
            let ethValue: bigint | undefined = undefined;
            
            // 如果用户输入了 ETH 金额但方法不是 payable，给出错误提示
            if (values.ethValue && !isPayable) {
                message.error({ 
                    content: `错误：此方法不是 payable，无法接收 ETH。请移除支付金额或选择 payable 方法。`, 
                    key: 'call',
                    duration: 5
                });
                return;
            }
            
            if (isPayable && values.ethValue) {
                try {
                    const amountStr = String(values.ethValue).trim();
                    if (!amountStr) {
                        ethValue = undefined;
                    } else {
                        const amount = parseFloat(amountStr);
                        if (isNaN(amount) || amount < 0) {
                            throw new Error('金额必须是有效的正数');
                        }
                        
                        // 根据选择的单位进行转换
                        const unit = values.ethValueUnit || 'ETH';
                        switch (unit) {
                            case 'ETH':
                                ethValue = ethers.parseEther(amountStr);
                                break;
                            case 'Gwei':
                                ethValue = ethers.parseUnits(amountStr, 'gwei');
                                break;
                            case 'Wei':
                                // Wei 是整数单位，需要确保是整数
                                if (!Number.isInteger(amount) || amountStr.includes('.')) {
                                    throw new Error('Wei 必须是整数');
                                }
                                try {
                                    ethValue = BigInt(amountStr);
                                } catch (e) {
                                    throw new Error('Wei 值超出范围，请输入有效的整数');
                                }
                                break;
                            default:
                                throw new Error(`未知的单位: ${unit}`);
                        }
                    }
                } catch (e: any) {
                    message.error({ 
                        content: `金额格式错误: ${e.message}`, 
                        key: 'call',
                        duration: 5
                    });
                    return;
                }
            }

            if (method.stateMutability === 'view' || method.stateMutability === 'pure') {
                // 只读方法，不需要签名
                const contract = new ethers.Contract(props.currentContract.address, abi, provider);
                const result = await contract[methodName](...params);
                
                // 序列化 BigInt 和其他无法序列化的值
                const serializedResult = serializeBigInt(result);
                setCallResult(serializedResult);
                
            } else {

                const ethersProvider = new ethers.BrowserProvider(getWalletProvider());
                const signer = await ethersProvider.getSigner(values.accountId);
                const contract = new ethers.Contract(props.currentContract.address, abi, signer);
                
                message.loading({ content: '正在发送交易...', key: 'call' });
                
                try {
                    console.debug('调用方法:', methodName, params, isPayable ? { value: ethValue } : undefined);
                    
                    // 如果是 payable 方法且提供了 ETH 金额，传递 value 选项
                    let tx;
                    if (isPayable && ethValue !== undefined) {
                        tx = await contract[methodName](...params, { value: ethValue });
                    } else {
                        tx = await contract[methodName](...params);
                    }
                    
                    const receipt = await tx.wait();

                    setCallResult(receipt);
                    message.success({ 
                        content: `交易成功! Hash: ${tx.hash}`, 
                        key: 'call',
                        duration: 5
                    });
                } catch (txError: any) {
                    // 处理交易错误
                    console.error('交易失败:', txError);
                    
                    // 解析错误消息（传入 ABI 以便解析自定义错误）
                    const errorMsg = parseRevertError(txError, abi);
                    
                    // 检查是否是用户拒绝
                    if (txError.code === 'ACTION_REJECTED' || txError.code === 4001) {
                        message.warning({ 
                            content: '您已取消交易', 
                            key: 'call',
                            duration: 3
                        });
                        return;
                    }
                    
                    // 检查是否是余额不足
                    if (txError.code === 'INSUFFICIENT_FUNDS' || errorMsg.includes('insufficient funds')) {
                        message.error({ 
                            content: '余额不足，无法支付 gas 费用', 
                            key: 'call',
                            duration: 5
                        });
                        return;
                    }
                    
                    // 其他错误 - 如果错误消息包含换行符，使用 Modal 显示详细错误
                    if (errorMsg.includes('\n')) {
                        Modal.error({
                            title: '交易失败',
                            content: (
                                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {errorMsg}
                                </div>
                            ),
                            width: 600,
                            okText: '确定'
                        });
                    } else {
                        message.error({ 
                            content: `交易失败: ${errorMsg}`, 
                            key: 'call',
                            duration: 8
                        });
                    }
                    throw txError; // 重新抛出以便外层 catch 处理
                }
            }

        } catch (e: any) {
            console.error('调用失败:', e);
            
            // 如果错误已经被处理过（有 key: 'call'），不再显示
            // 否则显示通用错误消息
            if (!e._handled) {
                // 尝试获取 ABI（如果之前已经解析过）
                let abiForError: any[] | undefined = undefined;
                try {
                    if (props.currentContract?.abi) {
                        abiForError = JSON.parse(props.currentContract.abi);
                    }
                } catch (e) {
                    // 忽略 ABI 解析错误
                }
                
                const errorMsg = parseRevertError(e, abiForError);
                // 如果错误消息包含换行符，使用 Modal 显示详细错误
                if (errorMsg.includes('\n')) {
                    Modal.error({
                        title: '调用失败',
                        content: (
                            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {errorMsg}
                            </div>
                        ),
                        width: 600,
                        okText: '确定'
                    });
                } else {
                    message.error({ 
                        content: `调用失败: ${errorMsg}`, 
                        key: 'call-error',
                        duration: 8
                    });
                }
            }
        }
    }, [props.currentContract, interactForm, props.accountList, getWalletProvider]);

    function isMethodHasParams(methodAbi: any) {
        return methodAbi && methodAbi.inputs && methodAbi.inputs.length > 0
    }

    function isMethodNeedAccount(methodAbi: any) {
        return methodAbi && methodAbi.stateMutability !== 'view' && methodAbi.stateMutability !== 'pure'
    }

    function isMethodPayable(methodAbi: any) {
        return methodAbi && methodAbi.stateMutability === 'payable'
    }

    function renderParamField(input: any, index: number) {
        return (
            <Form.Item
                key={index}
                name={`param_${input.name}`}
                label={`${input.name} (${input.type})`}
                rules={[{ required: true, message: `请输入${input.name}` }]}
            >
                <Input placeholder={`请输入${input.type}类型的值`} />
            </Form.Item>
        );
    }

    return (
        <div>
            <Form className={styles.interactForm} form={interactForm} layout="vertical" onFinish={callContractMethod}>
                <Form.Item
                    name="method"
                    label="选择方法"
                    rules={[{ required: true, message: '请选择方法' }]}
                >
                    <Select 
                        placeholder="请选择要调用的方法"
                        onChange={(value) => {
                            interactForm.resetFields(['accountId', 'ethValue', 'ethValueUnit']);
                            // 重置单位字段为默认值
                            interactForm.setFieldValue('ethValueUnit', 'ETH');
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
                                {isMethodHasParams(methodAbi) && (
                                    <>
                                        <Divider/>
                                        <Text strong>方法参数：</Text>
                                        {methodAbi.inputs.map((input: any, index: number) => renderParamField(input, index))}
                                    </>
                                )}

                                {isMethodNeedAccount(methodAbi) && (
                                    <Form.Item
                                        name="accountId"
                                        label="交易账户"
                                        rules={[{ required: true, message: '请选择交易账户' }]}
                                    >
                                        <Select placeholder="请选择用于签名交易的账户">
                                            {accountInfo?.accounts
                                                ?.map((account: any) => (
                                                    <Option key={account} value={account}>
                                                        {account} ({account?.substring(0, 8)}...)
                                                    </Option>
                                                )) || []}
                                        </Select>
                                    </Form.Item>
                                )}

                                {isMethodPayable(methodAbi) && (
                                    <>
                                        <Form.Item
                                            label="支付金额（可选）"
                                            extra="此方法支持接收 ETH，如需要支付，请输入金额和单位（留空则支付 0）"
                                        >
                                            <Input.Group compact>
                                                <Form.Item
                                                    name="ethValue"
                                                    noStyle
                                                    rules={[
                                                        { 
                                                            validator: (_, value) => {
                                                                if (!value || (typeof value === 'string' && value.trim() === '')) {
                                                                    return Promise.resolve(); // 允许为空
                                                                }
                                                                const numValue = parseFloat(String(value));
                                                                if (isNaN(numValue) || numValue < 0) {
                                                                    return Promise.reject(new Error('请输入有效的金额'));
                                                                }
                                                                return Promise.resolve();
                                                            }
                                                        }
                                                    ]}
                                                >
                                                    <Input 
                                                        placeholder="例如: 0.1（留空则为 0）" 
                                                        type="number"
                                                        step="any"
                                                        min="0"
                                                        style={{ width: 'calc(100% - 80px)' }}
                                                    />
                                                </Form.Item>
                                                <Form.Item
                                                    name="ethValueUnit"
                                                    noStyle
                                                    initialValue="ETH"
                                                >
                                                    <Select style={{ width: '80px' }}>
                                                        <Option value="ETH">ETH</Option>
                                                        <Option value="Gwei">Gwei</Option>
                                                        <Option value="Wei">Wei</Option>
                                                    </Select>
                                                </Form.Item>
                                            </Input.Group>
                                        </Form.Item>
                                    </>
                                )}
                            </>
                        );
                    }}
                </Form.Item>
                <Button type="primary" htmlType="submit" style={{ width: '100%' }}>调用</Button>
                <CallResult result={callResult} />
            </Form>
        </div>
    );
}

interface ICallResultProps {
    result: any;
}

function CallResult(props: ICallResultProps) {
    if (!props.result) return null;

    console.debug(props.result);

    return (
        <>
            <Divider/>
            <div>
                <Text strong>调用结果</Text><br/>
                <code>{JSON.stringify(props.result, null, 2)}</code>
            </div>
        </>
    );

}