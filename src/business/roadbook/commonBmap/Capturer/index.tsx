import { MutableRefObject, useContext, useEffect, useState } from "react";
import BmapContext from "../BmapContext";
import html2canvas from 'html2canvas';
import { Modal, message } from "antd";

interface ICapturer {
    trigger: ITrigger,
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

        setTimeout(() => {
            divId && captureInModal(divId);
        }, 500)
        
        
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
                scale: 1,
                allowTaint: true, // 允许跨域图片
                // foreignObjectRendering: true,
                backgroundColor: null,
            })
            let dataUrl = canvas.toDataURL('image/jpeg', 1.0);
            setModalWidth(dom.offsetWidth + 48);
            setDataUrl(dataUrl);
        } catch(e) {
            message.error('截屏失败！');
            console.error(e);
        }
    }

    function closeModal() {
        setDataUrl(null);
    }

    return <>
        <Modal open={dataUrl !== null} title="地图快照" footer={null} onCancel={closeModal} width={modalWidth}>
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
