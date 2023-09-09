import { useRef } from "react";

export default function useDebounce(fn: Function, ms: number) {

    let timer = useRef<NodeJS.Timeout | null>(null);

    return function proxy(this: any) {
        let _this: any = this;
        let args = arguments;

        if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
        } 

        timer.current = setTimeout(function() {
            fn.apply(_this, args);
            timer.current = null;
        }, ms);
    }

}