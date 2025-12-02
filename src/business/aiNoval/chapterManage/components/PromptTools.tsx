import {Button, Space, Input, message, Divider, GetRef, Row, Col} from 'antd';
import { useState } from 'react';
import { TextAreaRef } from 'antd/es/input/TextArea';

interface PromptToolsProps {
    prompt?: string;
    promptTextArea?: React.ReactNode | TextAreaRef;
    layout: 'horizontal' | 'vertical';
    onChange?: (prompt: string) => void;
}

type TagGenerator = (contentBefore: string, contentAfter: string) => string;

const PromptTools = (props: PromptToolsProps) => {

    const { layout = 'vertical' } = props;
    const [findString, setFindString] = useState('');
    const [replaceString, setReplaceString] = useState('');

    // 检验是否是受到支持的element类型
    function checkTextArea() {
        console.debug('props.promptTextArea', props.promptTextArea);

        const element: any = props.promptTextArea;
        if (!element) {
            message.error('未正确绑定TextArea: promptTextArea is not a TextAreaRef');
            return null;
        }

        // 判断是否是antd的TextArea
        if (typeof element?.resizableTextArea?.textArea?.className?.includes('ant-input')) {
            return 'antd-textarea';
        }

        return null;
    }

    // 检验是否是聚焦的element
    function checkElementFocus(elementType: string, element: any) {
        if (elementType === 'antd-textarea') {
            return document.activeElement === element.resizableTextArea.textArea;
        }
        return false;
    }

    // 拿到textarea的内容
    function getElementString(elementType: string, element: any) {
        if (elementType === 'antd-textarea') {
            return element.resizableTextArea.textArea.value;
        }
        
        throw new Error('getElementString未获得正确的elementType，现在的elementType是: ' + elementType);
    }



    // 替换首个
    function doReplaceFirst() {
        const elementType = checkTextArea();
        if (!elementType) {
            message.error('未正确绑定TextArea: promptTextArea is not a TextAreaRef');
            return;
        }

        if (!checkElementFocus(elementType, props.promptTextArea)) {
            message.error('光标不在目标内');
            return;
        }

        if (!findString) {
            message.error('请输入查找内容');
            return;
        }

        const sourceString = getElementString(elementType, props.promptTextArea);
        
        if (!sourceString.includes(findString)) {
            message.error('未找到查找内容');
        }

        let replacedString = sourceString.replace(findString, replaceString);
        props.onChange?.(replacedString);
    }

    // 替换所有
    function doReplaceAll() {
        const elementType = checkTextArea();
        if (!elementType) {
            message.error('未正确绑定TextArea: promptTextArea is not a TextAreaRef');
            return;
        }

        if (!findString) {
            message.error('请输入查找内容');
            return;
        }

        const sourceString = getElementString(elementType, props.promptTextArea);
        
        if (!sourceString.includes(findString)) {
            message.error('未找到查找内容');
        }

        let replacedString = sourceString.replaceAll(findString, replaceString);
        props.onChange?.(replacedString);
    }

    function getInputPosition(elementType: string, element: any) {
        if (elementType === 'antd-textarea') {
            return element.resizableTextArea.textArea.selectionStart ?? -1;
        }
        return -1;
    }

    function doAddTag(tagGenerator: string | TagGenerator) {
        const elementType = checkTextArea();
        if (!elementType) {
            message.error('未正确绑定TextArea: promptTextArea is not a TextAreaRef');
            return;
        }
        
        const inputPosition = getInputPosition(elementType, props.promptTextArea);
        if (inputPosition === -1) {
            message.error('光标不在目标内');
            return;
        }

        const sourceString = getElementString(elementType, props.promptTextArea);
        let tagText: string;
        if (typeof tagGenerator === 'function') {
            tagText = tagGenerator(sourceString.slice(0, inputPosition), sourceString.slice(inputPosition));
        } else {
            tagText = tagGenerator;
        }
        
        let insertedString = sourceString.slice(0, inputPosition) + tagText + sourceString.slice(inputPosition);
        props.onChange?.(insertedString);
    }

    function IndexedTagGenerator(tagPrefix: string) {
        return (contentBefore: string, contentAfter: string) => {
            let maxIndex = 0;
            const pattern = `${tagPrefix}\\s?(?<index>\\d+)`;
            const regex = new RegExp(pattern, 'g');
            let match;
            while ((match = regex.exec(contentBefore)) !== null) {
                const foundIndex = match.groups?.index ? parseInt(match.groups.index, 10) : 0;
                if (foundIndex > maxIndex) {
                    maxIndex = foundIndex;
                }
            }
            return `${tagPrefix} ${maxIndex + 1}：`;
        }
    }

    return (
        <div>
            {/* <Button type="primary" style={{ width: '100%'}}>复制全文</Button> */}
            <Divider size="small">替换</Divider>
            <Space direction={layout}>
                <Input placeholder="查找内容" size="small" value={findString} onChange={(e) => setFindString(e.target.value)} />
                <Input placeholder="替换内容" size="small" value={replaceString} onChange={(e) => setReplaceString(e.target.value)} />
                {/* <Button size="small" style={{ width: '100%'}} onMouseDown={doReplaceFirst}>替换光标后首个</Button> */}
                <Button size="small" type="primary" style={{ width: '100%'}} onClick={doReplaceAll}>替换所有</Button>
            </Space>
            <Divider size="small">常量标签</Divider>
            <Row>
                <Col span={12} style={{ display: 'flex', justifyContent: 'center' }}>
                    <Space direction={layout} align="center">
                        <Button size="small" type="primary" onClick={() => doAddTag('章节')}>章节</Button>
                        <Button size="small" type="primary" onClick={() => doAddTag('片段')}>片段</Button>
                    </Space>
                </Col>
                <Col span={12} style={{ display: 'flex', justifyContent: 'center' }}>
                    <Space direction={layout} align="center">
                        <Button size="small" type="primary" onClick={() => doAddTag('人物：')}>人物</Button>
                        <Button size="small" type="primary" onClick={() => doAddTag('阵营：')}>阵营</Button>
                        <Button size="small" type="primary" onClick={() => doAddTag('目的：')}>目的</Button>
                        <Button size="small" type="primary" onClick={() => doAddTag('内容：')}>内容</Button>
                    </Space>
                </Col>
            </Row>
            <Divider size="small">索引标签</Divider>
            <Space direction={layout} style={{ width: '100%'}}>
                <Button size="small" type="primary" block onClick={() => doAddTag(IndexedTagGenerator('片段'))}>片段</Button>
                <Button size="small" type="primary" block onClick={() => doAddTag(IndexedTagGenerator('Day'))}>Day</Button>
            </Space>
        </div>
    )
}

export default PromptTools;
