import { createContext, useContext, useEffect, useRef, useState } from "react";

const SimpleSvgContext = createContext<ISimpleSvgProviderState | null>(null);

export interface ISimpleSvgProviderProps {
    children: React.ReactNode;
    svgClassName?: string;
}

export interface ISimpleSvgProviderState {
    svg: SVGSVGElement | null;
    dimensions: { width: number; height: number };
}

export default function SimpleSvgProvider({ children, svgClassName }: ISimpleSvgProviderProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    
    useEffect(() => {
        if (svgRef.current) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const { width, height } = entry.contentRect;
                    setDimensions({ width, height });
                }
            });
            resizeObserver.observe(svgRef.current);
            setIsInitialized(true);

            return () => {
                resizeObserver.disconnect();
            }
        }
    }, []);

    let Content: React.ReactNode = <text>Loading...</text>;
    if (isInitialized) {
        Content = children || <text x="0.5em" y="1.5em">no children... (maybe you forgot to wrap the component with SimpleSvgProvider?)</text>;
    }

    return <SimpleSvgContext.Provider value={{ 
        svg: svgRef.current, 
        dimensions
    }}>
        <svg ref={svgRef} className={svgClassName || 'f-fit-content'} width={dimensions.width} height={dimensions.height}>
            {Content}
        </svg>
    </SimpleSvgContext.Provider>
}

export function useSimpleSvg() {
    return useContext(SimpleSvgContext);
}
