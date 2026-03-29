import { useContext } from "react";
import * as d3 from "d3";
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
    if (relationType === 'role-event') {
        return <RoleRelationSubLayer />;
    }
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

/**
 * 同一角色串联事件（时间顺序）：d3.curveMonotoneY 保证沿路径的屏幕 y（时间轴）单调，不出现 Catmull-Rom 式回旋；
 * 曲线精确经过每个事件的 (x,y)。d3 要求控制点 y 递增；若时间增大时屏幕 y 减小，则对 y 取负生成样条，再用 scale(1,-1) 还原，保持时间先后与几何一致。
 */
function buildRoleEventPathD(points: [number, number][]): { d: string; flipY: boolean } | null {
    if (points.length < 2) {
        return null;
    }
    const yInc = points[0][1] <= points[points.length - 1][1];
    const ptsForLine: [number, number][] = yInc
        ? points
        : points.map(([x, y]) => [x, -y] as [number, number]);
    const line = d3
        .line<[number, number]>()
        .x((d) => d[0])
        .y((d) => d[1])
        .curve(d3.curveMonotoneY);
    const d = line(ptsForLine);
    if (!d) {
        return null;
    }
    return { d, flipY: !yInc };
}

function roleRelationStroke(roleId: number): string {
    const hue = (Math.abs(roleId) * 47) % 360;
    return `hsl(${hue} 42% 48%)`;
}

export function RoleRelationSubLayer() {
    const { timelineEvents } = useContext(GraphDataContext);
    const { getXofGeoCode, timelineToScreenY } = useContext(FigureCommonContext);

    const paths = (() => {
        const byRole = new Map<number, ITimelineEvent[]>();
        const seenByRole = new Map<number, Set<number>>();
        for (const event of timelineEvents || []) {
            for (const rid of event.role_ids || []) {
                const id = parseInt(String(rid), 10);
                if (Number.isNaN(id)) {
                    continue;
                }
                let list = byRole.get(id);
                if (!list) {
                    list = [];
                    byRole.set(id, list);
                    seenByRole.set(id, new Set());
                }
                const seen = seenByRole.get(id)!;
                if (seen.has(event.id)) {
                    continue;
                }
                seen.add(event.id);
                list.push(event);
            }
        }

        const out: { roleId: number; d: string; flipY: boolean }[] = [];
        for (const [roleId, events] of Array.from(byRole.entries())) {
            events.sort((a: ITimelineEvent, b: ITimelineEvent) => {
                if (a.date !== b.date) {
                    return a.date - b.date;
                }
                return a.id - b.id;
            });
            const pts: [number, number][] = events.map((e: ITimelineEvent) => [
                getXofGeoCode(e.location),
                timelineToScreenY(e.date),
            ]);
            const built = buildRoleEventPathD(pts);
            if (built) {
                out.push({ roleId, d: built.d, flipY: built.flipY });
            }
        }
        return out;
    })();

    return (
        <g className={styles.roleRelation}>
            {paths.map(({ roleId, d, flipY }) => (
                <g key={`role-rel-${roleId}`} transform={flipY ? "scale(1,-1)" : undefined}>
                    <path
                        className={styles.roleRelationLine}
                        d={d}
                        stroke={roleRelationStroke(roleId)}
                    />
                </g>
            ))}
        </g>
    );
}
