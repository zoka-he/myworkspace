import { useRef, useLayoutEffect, createContext, useState, useEffect, useContext } from "react";

interface IBoxSizeProviderProps {
    children: React.ReactNode;
    className?: string;
    debug?: boolean;
    style?: React.CSSProperties;
}

interface IBoxSizeProviderState {
    width: number;
    height: number;
}

const BoxSizeContext = createContext<IBoxSizeProviderState>({ width: 0, height: 0 });

export function SimpleBoxSizeProvider(props: IBoxSizeProviderProps) {
    const boxRef = useRef<HTMLDivElement>(null);
    const resizeObserverRef = useRef<ResizeObserver>(null);
    const [isReady, setIsReady] = useState(false);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);

    function onResize(event: UIEvent) {
        const { width, height } = boxRef.current?.getBoundingClientRect() || { width: 0, height: 0 };

        setTimeout(() => {
            setWidth(width);
            setHeight(height);
        }, 0);
    }

    function unregisterResizeObserver() {
        window.removeEventListener('resize', onResize);
    }

    function registerResizeObserver() {
        unregisterResizeObserver();

        if (boxRef.current) {
            window.addEventListener('resize', onResize);
        }
    }

    useEffect(() => {
        if (boxRef.current) {
            registerResizeObserver();
            setIsReady(true);
        }

        return () => {
            setIsReady(false);
            unregisterResizeObserver();
        };
    }, []);

    useEffect(() => {
        if (!boxRef.current) {
            setIsReady(false);
            unregisterResizeObserver();
        } else {
            registerResizeObserver();
            setIsReady(true);
        }
    }, [boxRef.current]);

    const boxStyle = {
        border: props.debug ? '1px solid red' : 'none',
        width: '100%',
        overflow: 'visible',
        ...props.style,
    }

    return (
        <div ref={boxRef} className={props.className || ''} style={boxStyle}>
            <BoxSizeContext.Provider value={{ width, height }}>
                {isReady ? props.children : <div>Loading...</div>}
            </BoxSizeContext.Provider>
        </div>
    )
}

export function useBoxSize() {
    return useContext(BoxSizeContext);
}