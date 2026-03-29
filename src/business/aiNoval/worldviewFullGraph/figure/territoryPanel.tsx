import { useContext } from "react";
import FigureCommonContext from "./figureCommonContainer";
import styles from './territoryPanel.module.scss';
import { useFactions } from "../hooks";
import { EventManage2DataContext } from '../context'
import { IFactionTerritory } from "@/src/types/IAiNoval";

interface ITerritoryPanelProps {
    style?: React.CSSProperties;
    className?: string;
    offsetX?: number;
    offsetY?: number;
}

export default function TerritoryPanel(props: ITerritoryPanelProps) {
    const { style, className, offsetX, offsetY } = props;

    const { svgSize, geoPartitions, screenYToTimeline } = useContext(FigureCommonContext);
    const [factionList] = useFactions();
    const { territoryList } = useContext(EventManage2DataContext);

    const lineHeight = 10;

    let currentTerritories: { territory: IFactionTerritory, depth: number }[] = [];
    if (typeof offsetX === 'number' && typeof offsetY === 'number') {
        let time = screenYToTimeline(offsetY);

        let avaliableGeoPartitions = geoPartitions.filter(d => d.x0 <= offsetX && d.x1 >= offsetX);

        currentTerritories = territoryList?.filter(d => {
            if (!d.geo_code) {
                // console.debug('territory without geo_code --->> ', d);
                return false;
            }

            if (!d.start_date) {
                // console.debug('territory without start_date --->> ', d);
                return false;
            }

            if (!avaliableGeoPartitions.some(g => g.data.code === d.geo_code)) {
                // console.debug('territory not in avaliableGeoPartitions --->> ', d);
                return false;
            }

            if (d.start_date > time) {
                // console.debug('territory start_date is after time --->> ', d);
                return false;
            }

            if (typeof d.end_date === 'number' && d.end_date < time) {
                // console.debug('territory end_date is before time --->> ', d);
                return false;
            }

            return true;
        })
        .map(d => {
            return {
                territory: d,
                depth: avaliableGeoPartitions.find(g => g.data.code === d.geo_code)?.depth ?? 0,
            }
        })
        .sort((a, b) => a.depth - b.depth);
    }

    function renderTerritory(territory: IFactionTerritory) {
        const pl = 4;
        const pt = 4;

        const fontSize = 10;
        const paragraphSpacing = fontSize * 0.1;
        const lineHeight = fontSize * 1.5;
        
        const maxFontPerLine = Math.floor(svgSize.width / 2 / fontSize) - 1;

        // 没有 geo_code 则不渲染
        if (!territory?.geo_code) return (
            <g>
                <rect className={ styles.titleBackground } x={0} y={0} width={svgSize.width / 2} height={lineHeight * 1.4}/>
            </g>
        );

        
        let matchedGeoPartition = geoPartitions.find(g => g?.data?.code === territory.geo_code);
        let title = territory.alias_name || matchedGeoPartition?.data.name || '';
        let factionName = factionList.find(f => f.id === territory.faction_id)?.name || '';
        let detail = territory.description || matchedGeoPartition?.data.detail || '';

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
                <rect 
                    className={ styles.titleBackground } 
                    x={0} y={0} 
                    width={svgSize.width / 2} height={lineHeight * 1.4}
                />
                <text 
                    className={styles.partition} 
                    x={pl} y={pt + fontSize} 
                    fontSize={fontSize}
                >{factionName} - {title}</text>
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
        <div className={`${styles.territoryPanel} ${className}`} style={style}>
            <svg className="w-full h-full">
                {renderTerritory(currentTerritories[0]?.territory)}
            </svg>
        </div>
    )
}