import { useCallback, useEffect, useRef } from "react";

export default function useDebounce(fn: Function, ms: number) {

    let timer = useRef<NodeJS.Timeout | null>(null);
    let callback = useRef<Function | null>(fn);

    useEffect(() => {
        return () => {
            if (timer.current) {
                clearTimeout(timer.current);
                timer.current = null;
            }
        };
    }, []);

    useEffect(() => {
        callback.current = fn;
    }, [fn]);

    const debounced = useCallback((...args: any[]) => {
        let _this = this as any;

        if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
        }

        timer.current = setTimeout(() => {
            callback.current?.apply(_this, args);
        }, ms);
    }, [ms]);

    return debounced;
}