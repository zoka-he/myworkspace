import { MutableRefObject, useContext, useEffect, useState } from "react";
import BmapContext from "../BmapContext";
import html2canvas from 'html2canvas';
import { Button, Modal, message } from "antd";
import copyToClip from "@/src/utils/common/copy";

interface ICapturer {
    trigger: ITrigger,
    timeout?: number,
    onCapture?: (result: any) => void
}

export default function Capturer(props: ICapturer) {

    let mapType: string, 
        mAmapDiv: MutableRefObject<HTMLDivElement | null>, 
        mBmapDiv: MutableRefObject<HTMLDivElement | null>;

    let [dataUrl, setDataUrl] = useState<string | null>(null);
    let [modalWidth, setModalWidth] = useState(520);

    ({ mapType, mAmapDiv, mBmapDiv } = useContext(BmapContext));

    useEffect(() => {
        if (!props.trigger.trigger) {
            return;
        }

        props.trigger.setTrigger(false);

        // if (typeof props.onCapture !== 'function') {
        //     return;
        // }

        let divId: string | undefined;
        switch(mapType) {
            case 'baidu':
                divId = mBmapDiv.current?.id;
                break;
            case 'gaode':
                divId = mAmapDiv.current?.id;
                break;
        }

        let timeoutMs = 200;
        if (typeof props.timeout === 'number') {
            timeoutMs = props.timeout;
        }
        setTimeout(() => {
            divId && captureInModal(divId);
        }, timeoutMs);
        
        
    }, [props.trigger.trigger]);

    

    async function captureInModal(divId: string) {
        try {
            let dom = document.getElementById(divId);
            if (!dom) {
                message.error('无法获得地图组件ID，截屏失败！');
                return;
            }
            // let dataUrl = await dom2img.toPng(dom);

            let canvas = await html2canvas(dom, {
                useCORS: true, // 【重要】开启跨域配置
                scale: 0.6,
                allowTaint: true, // 允许跨域图片
                // foreignObjectRendering: true,
                backgroundColor: null,
            })
            let dataUrl = canvas.toDataURL('image/jpeg', 1.0);
            setModalWidth(Math.ceil(dom.offsetWidth * 0.6 + 48));
            setDataUrl(dataUrl);
        } catch(e) {
            message.error('截屏失败！');
            console.error(e);
        }
    }

    function closeModal() {
        setDataUrl(null);
    }

    function copyUrl() {
        dataUrl && copyToClip(`#### 路线图\r\n\r\n![mapData路线图][mapData]\r\n\r\n[mapData]:${dataUrl}`);
        message.success('已复制')
    }

    let modalTitle = <span>
        <strong>地图快照</strong>
        <Button type="link" onClick={copyUrl}>复制为MD格式</Button>
    </span>

    return <>
        <Modal 
            open={dataUrl !== null} 
            title={modalTitle} 
            footer={null} 
            onCancel={closeModal} 
            width={modalWidth}
        >
            <img src={dataUrl || ''} alt="mapshot.png"/>
        </Modal>
    </>;
}

interface ITrigger {
    doCapture: () => void
    trigger: boolean
    setTrigger: (b: boolean) => void
}

Capturer.useTrigger = function(): ITrigger {
    let [trigger, setTrigger] = useState(false);

    function doCapture() {
        setTrigger(true);
    }

    return {
        doCapture,
        trigger,
        setTrigger
    }
}
