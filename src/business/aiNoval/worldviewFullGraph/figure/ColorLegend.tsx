import { IFactionDefData, IStoryLine } from "@/src/types/IAiNoval";
import { useContext, useMemo } from "react";
import { useFactions, useStoryLines } from "../hooks";
import FigureCommonContext from "./figureCommonContainer";
import styles from "./ColorLegend.module.scss";
import { Divider, Typography } from "antd";

const { Text } = Typography;

interface IColorLegendProps {
    items: { label: string; color: string }[];
    title: string;
}

export default function ColorLegend(props: IColorLegendProps) {
    const { items } = props;

    const textSize = 10;

    const svgHeight = useMemo(() => {
        return items.length * (textSize + 4);
    }, [items]);

    function renderItem(item: { label: string; color: string }, index: number) {
        const actualIndex = item.label || `item-${index}`;

        return (
            <g key={actualIndex} transform={`translate(0, ${index * (textSize + 4)})`}>
                <rect x={0} y={0} width={10} height={10} fill={item.color} />
                <text className={styles.legendItemText} x={16} y={textSize / 2 + 4} fontSize={textSize} textAnchor="start">{item.label}</text>
            </g>
        )
    }

    function renderTitle() {
        if (props.title) {
            return (
                <>
                    <Text type="secondary">{props.title}</Text>
                    <Divider size="small"/>
                </>
            );
        }
        return null;
    }

    return (
        <div className={`${styles.legendContainer} w-full p-2 ml-1 mb-2`}>
            {renderTitle()}
            <svg width="100%" height={svgHeight}>
                {(items || []).map(renderItem)}
            </svg>
        </div>
    )
}

export function StoryLineColorLegend() {
    const [storyLineList] = useStoryLines();
    const { getStoryLineRainbowColor } = useContext(FigureCommonContext);

    const items = useMemo(() => {
        return storyLineList.map((storyLine) => ({
            label: storyLine.name,
            color: getStoryLineRainbowColor(storyLine.id),
        }));
    }, [storyLineList, getStoryLineRainbowColor]);

    return <ColorLegend items={items} title="故事线图例" />;
}

interface IFactionColorLegendProps {
    factions?: IFactionDefData[];
    filterAlgorithm?: 'all' | 'base' | ((faction: IFactionDefData) => boolean);
}

export function FactionColorLegend(props: IFactionColorLegendProps) {
    const [factionList] = useFactions();
    const { getFactionColor } = useContext(FigureCommonContext);

    function allFilterAlgorithm(faction: IFactionDefData) {
        return true;
    }

    function baseFilterAlgorithm(faction: IFactionDefData) {
        return faction.parent_id === null || faction.parent_id === undefined;
    }

    const items = useMemo(() => {

        let actualFactions: IFactionDefData[] = [];
        if (props.factions) {
            actualFactions = props.factions;
        } else {
            actualFactions = factionList;
        }

        let filterAlgorithm = baseFilterAlgorithm;
        if (props.filterAlgorithm === 'all') {
            filterAlgorithm = allFilterAlgorithm;
        } else if (props.filterAlgorithm instanceof Function) {
            filterAlgorithm = props.filterAlgorithm;
        }

        actualFactions = actualFactions.filter(filterAlgorithm);

        return actualFactions.map((faction) => ({
            label: faction.name || '<未命名>',
            color: getFactionColor(faction),
        }));
    }, [factionList, getFactionColor, props.factions]);

    return <ColorLegend items={items} title="阵营图例" />;
}