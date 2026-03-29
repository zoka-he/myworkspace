import { useContext, useMemo } from "react";
import { EventManage2DataContext } from "../context";
import { useFactions } from "../hooks";
import FigureCommonContext from "./figureCommonContainer";
import { IFactionTerritory } from "@/src/types/IAiNoval";

export default function TerritoryLayer() {
    const { territoryList } = useContext(EventManage2DataContext);
    const [factionList] = useFactions();
    const {getFactionColor, getXRangeofGeoCode, timelineToScreenY, timelineRange} = useContext(FigureCommonContext);
    
    function renderTerritory(territory: IFactionTerritory) {
        if (!territory.geo_code) return null;
        if (!territory.faction_id) return null;

        const faction = factionList.find(item => item.id === territory.faction_id);
        if (!faction) return null;


        const [x0, x1] = getXRangeofGeoCode(territory.geo_code ?? '');
        const y0 = timelineToScreenY(territory.start_date ?? 0);
        let y1 = 0;
        
        if (territory.end_date) {
            y1 = timelineToScreenY(territory.end_date);   
        } else if (timelineRange[1]) {
            y1 = Math.min(y0, timelineToScreenY(timelineRange[1]));
        }

        return (
            <rect x={x0} y={y1} width={Math.abs(x1 - x0)} height={Math.abs(y0-y1)} fill={getFactionColor(faction)} />
        )
    }

    let territoryItems: React.ReactNode[] = [];
    if (territoryList) {
        territoryItems = territoryList.map(renderTerritory);
    }

    return (
        <g opacity={0.15}>
            {territoryItems}
        </g>
    )
}