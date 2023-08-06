import { Space, Checkbox } from "antd";
import { useEffect, useState } from "react";

interface IPermSwitchProps {
    RID?: number,
    PID?: number,
    type?: 'api' | 'menu' | 'obj' | string,
    srcData?: Map<number, any>,
    onChange?: Function
}

export default function(props: IPermSwitchProps) {

    let [checkGet, setCheckGet] = useState(false);
    let [checkPost, setCheckPost] = useState(false);
    let [checkDel, setCheckDel] = useState(false);

    useEffect(() => {
        if (!(props.srcData instanceof Map) || typeof props.PID !== 'number') {
            setCheckGet(false);
            setCheckPost(false);
            setCheckDel(false);
            return;
        } 

        let rpData = props.srcData.get(props.PID) 
        if (!rpData) {
            setCheckGet(false);
            setCheckPost(false);
            setCheckDel(false);
            return;
        }

        setCheckGet(rpData.get == 1);
        setCheckPost(props.type === 'api' && rpData.post == 1);
        setCheckDel(props.type === 'api' && rpData.del == 1);
    }, [ props.srcData, props.PID ]);

    let disabled = !props.RID || !props.PID || !(props.srcData instanceof Map);
    let view = null;

    function setCheck(name: string, value: boolean) {
        let payload = {
            PID: props.PID,
            RID: props.RID,
            get: checkGet,
            post: checkPost,
            del: checkDel
        }

        switch(name) {
            case 'get':
                setCheckGet(value);
                payload.get = value;
                break;
            case 'post':
                setCheckPost(value);
                payload.post = value;
                break;
            case 'del':
                setCheckDel(value);
                payload.del = value;
                break;    
        }

        if (props.onChange) {
            props.onChange(payload);
        }
    }

    switch (props.type) {
        case 'menu':
            view = (
                <Space>
                    <Checkbox checked={checkGet} onChange={e => setCheck('get', e.target.checked)} disabled={disabled}>访问页面</Checkbox>
                </Space>
            );
            break;
        case 'api':
            view = (
                <Space>
                    <Checkbox checked={checkGet} onChange={e => setCheck('get', e.target.checked)} disabled={disabled}>GET</Checkbox>
                    <Checkbox checked={checkPost} onChange={e => setCheck('post', e.target.checked)} disabled={disabled}>POST</Checkbox>
                    <Checkbox checked={checkDel} onChange={e => setCheck('del', e.target.checked)} disabled={disabled}>DELETE</Checkbox>
                </Space>
            );
            break;
    }

    return view;
}