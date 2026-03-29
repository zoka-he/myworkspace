import { useContext } from "react";
import GraphDataContext from "../graphDataContext";
import { useTimelines  } from "../hooks";
import FigureCommonContext from "../figure/figureCommonContainer";
import { ITimelineEvent } from "@/src/types/IAiNoval";
import styles from "./EventLayer.module.scss";

interface IEventLayerProps {
    relationType: string;
}

export default function EventLayer(props: IEventLayerProps) {
    return (
        <g>
            <RelationSubLayer relationType={props.relationType} />
            <EventSubLayer />
        </g>
    )
}


export function EventSubLayer() {
    const { timelineEvents } = useContext(GraphDataContext);
    const { timelineToScreenY, getXofGeoCode, getStoryLineRainbowColor } = useContext(FigureCommonContext);

    function eventRender(event: ITimelineEvent) {
        const storyLineColor = getStoryLineRainbowColor(event.story_line_id);

        return (
            <g key={`event-${event.id}`} data-event-id={event.id} transform={`translate(${getXofGeoCode(event.location)}, ${timelineToScreenY(event.date)})`}>
                <circle cx={0} cy={0} r={5} fill={storyLineColor} />
                <text className={styles.eventItemText} x={10} y={3} textAnchor="start" fontSize="9px" fill={storyLineColor}>
                    {event.title}
                </text>
            </g>
        )
    }

    let eventElements = (timelineEvents || []).map(eventRender);

    return (
        <g className={styles.eventLayer}>
            {eventElements}
        </g>
    )
}

interface IRelationSubLayerProps {
    relationType: string;
}

export function RelationSubLayer(props: IRelationSubLayerProps) {
    const { relationType } = props;
    if (relationType === 'geo-event') {
        return <GeoRelationSubLayer />;
    }
    // if (relationType === 'role-event') {
    //     return <RoleRelationSubLayer />;
    // }
    // if (relationType === 'faction-event') {
    //     return <FactionRelationSubLayer />;
    // }
    return null;
}

export function GeoRelationSubLayer() {
    const { timelineEvents } = useContext(GraphDataContext);
    const { getXofGeoCode, timelineToScreenY } = useContext(FigureCommonContext);

    let relationMap = new Map<string, IGeoEventRelation>();
    (timelineEvents || []).forEach(event => {
        if (event.location) {
            let relation: IGeoEventRelation | undefined = relationMap.get(event.location);
            if (relation) {
                relation = Object.assign({}, relation);

                if (event.date < relation.start_time) {
                    relation.start_time = event.date;
                }
                if (event.date > relation.end_time) {
                    relation.end_time = event.date;
                }
            } else {
                relation = {
                    geo_code: event.location,
                    start_time: event.date,
                    end_time: event.date,
                };
            }

            relationMap.set(event.location, relation);
        }
    });

    let relationElements = Array.from(relationMap.values()).map(relation => {

        return (
            <g className={styles.geoRelation} key={relation.geo_code}>
                <line 
                    className={styles.geoRelationLine}
                    x1={getXofGeoCode(relation.geo_code)} 
                    y1={timelineToScreenY(relation.start_time)} 
                    x2={getXofGeoCode(relation.geo_code)} 
                    y2={timelineToScreenY(relation.end_time)} 
                />
            </g>
        )
    });

    return (
        <g>
            {relationElements}
        </g>
    )
}