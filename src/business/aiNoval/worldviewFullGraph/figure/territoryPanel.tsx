import { useContext } from "react";
import FigureCommonContext from "./figureCommonContainer";
import styles from './territoryPanel.module.scss';

interface ITerritoryPanelProps {
    style?: React.CSSProperties;
    className?: string;
}

export default function TerritoryPanel(props: ITerritoryPanelProps) {
    const { style } = props;
    return (
        <div className={`${styles.territoryPanel} ${props.className}`} style={style}>
            <div></div>
        </div>
    )
}