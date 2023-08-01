import { useState, useRef } from "react";

interface IModalHelper {
    open: Readonly<boolean>,
    show: Function,
    showAndEdit: Function,
    close: Function,
    getPayload: Function,
    setPayload: Function,
}

function useModalHelper(): IModalHelper {
    let [open, setOpen] = useState(false);
    let payload = useRef<any>();

    return {
        open,
        show() {
            setOpen(true);
        },
        showAndEdit(obj: any) {
            payload.current = obj;
            setOpen(true);
        },
        close() {
            setOpen(false);
            payload.current = null;
        },
        getPayload() {
            return payload.current;
        },
        setPayload(obj: any) {
            payload.current = obj;
        }
    }
}

export default useModalHelper;
export type { IModalHelper };