import styles from './geoPanel.module.scss';
import { useContext } from 'react';
import FigureCommonContext from './figureCommonContainer';
import { GeoPartitionTree } from '../vo/geoPartitionTree';

interface IGeoPanelProps {
    style?: React.CSSProperties;
    className?: string;
    offsetX?: number;
}

export default function GeoPanel(props: IGeoPanelProps) {
    const { style, className, offsetX } = props;

    const { geoPartitions, svgSize } = useContext(FigureCommonContext);

    let currentPartitions: d3.HierarchyRectangularNode<GeoPartitionTree>[] = [];
    if (offsetX) {
        currentPartitions = geoPartitions.filter(d => d.x0 <= offsetX && d.x1 >= offsetX).sort((a, b) => a.depth - b.depth);
    }

    function renderPartitions(partitions: d3.HierarchyRectangularNode<GeoPartitionTree>[]) {

        const pl = 4;
        const pt = 4;

        const fontSize = 10;
        const paragraphSpacing = fontSize * 0.1;
        const lineHeight = fontSize * 1.5;
        
        const maxFontPerLine = Math.floor(svgSize.width / 2 / fontSize) - 1;

        const lastPartition = partitions[partitions.length - 1];
        const detail = lastPartition?.data?.detail || '';

        // 将 detail 按 maxFontPerLine 进行切分，得到多行字符串数组
        const wrapDetail = (text: string, maxLen: number, maxLines: number) => {
            if (!text) return [];
            const result: string[] = [];
            let start = 0;
            while (start < text.length && result.length < maxLines) {
                result.push(text.slice(start, start + maxLen));
                start += maxLen;
            }
            return result;
        };
        const detailLines = wrapDetail(detail, maxFontPerLine, 4);

        return (
            <g>
                <text className={styles.partition} x={pl} y={pt + fontSize} fontSize={fontSize}>{partitions.map(item => item.data.name).join(' > ')}</text>
                {detailLines.map((line, index) => (
                    <text 
                        className={styles.partition} 
                        x={pl} 
                        y={pt + (index + 2) * lineHeight + paragraphSpacing} 
                        fontSize={fontSize}
                        opacity={0.8}
                    >{line}</text>
                ))}
            </g>
        )
    }

    return (
        <div className={`${styles.geoPanel} ${className}`} style={style}>
            <svg className="w-full h-full">
                {renderPartitions(currentPartitions)}
            </svg>
        </div>
    )

}