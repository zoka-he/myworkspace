'use client';

import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import GraphDataContext from '../graphDataContext';
import { useFactions, useGeos, useRoles, useStoryLines, useWorldViewData } from '../hooks';
import { TimelineDateFormatter } from '../../common/novelDateUtils';
import type { ITimelineEvent } from '@/src/types/IAiNoval';
import styles from './EventTip.module.scss';

const POINTER_GAP = 12;
const VIEW_MARGIN = 8;

interface IEventTipProps {
    eventId: number | null;
    position: { clientX: number; clientY: number };
}

function clampTipPosition(
    el: HTMLElement,
    clientX: number,
    clientY: number,
): { left: number; top: number } {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = clientX + POINTER_GAP;
    let top = clientY + POINTER_GAP;

    const w = el.offsetWidth;
    const h = el.offsetHeight;

    if (left + w > vw - VIEW_MARGIN) {
        left = clientX - w - POINTER_GAP;
    }
    if (top + h > vh - VIEW_MARGIN) {
        top = clientY - h - POINTER_GAP;
    }

    left = Math.min(Math.max(VIEW_MARGIN, left), vw - w - VIEW_MARGIN);
    top = Math.min(Math.max(VIEW_MARGIN, top), vh - h - VIEW_MARGIN);

    return { left, top };
}

function EventTipBody({ event }: { event: ITimelineEvent }) {
    const [worldViewData] = useWorldViewData();
    const [storyLineList] = useStoryLines();
    const [geoList] = useGeos();
    const [roleList] = useRoles();
    const [factionList] = useFactions();

    const dateText = useMemo(() => {
        if (!worldViewData) return String(event.date);
        return TimelineDateFormatter.fromWorldViewWithExtra(worldViewData).formatSecondsToDate(event.date);
    }, [worldViewData, event.date]);

    const storyLineName = useMemo(() => {
        const line = storyLineList.find((s) => s.id === event.story_line_id);
        return line?.name ?? `故事线 #${event.story_line_id}`;
    }, [storyLineList, event.story_line_id]);

    const geoName = useMemo(() => {
        const geo = geoList.find((g) => g.code === event.location);
        return geo?.name ?? `地点 #${event.location}`;
    }, [geoList, event.location]);

    const factionNames = useMemo(() => {
        if (event.faction_ids.length === 0) return [];
        return event.faction_ids.map((id) => {
            const faction = factionList.find((f) => f.id === id);
            return faction?.name ?? `势力 #${id}`;
        }).join(' | ');
    }, [factionList, event.faction_ids]);

    const roleNames = useMemo(() => {
        if (event.role_ids.length === 0) return [];
        return event.role_ids.map((id) => {
            
            if ((String(id)).includes('|')) {
                id = id.split('|')[1].trim();
            }
            const role = roleList.find((r) => r.id === parseInt(id));
            return role?.name ?? `角色 #${id}`;
        }).join(' | ');
    }, [roleList, event.role_ids]);

    return (
        <>
            <div className={styles.title}>{event.title}</div>
            <div className={styles.meta}>
                <span>{dateText}</span>
                <span className={styles.dot}>·</span>
                <span>{storyLineName}</span>
            </div>
            {event.location ? (
                <div className={styles.row}>
                    <span className={styles.label}>地点</span>
                    <span className={styles.value}>{geoName}</span>
                </div>
            ) : null}
            {event.faction_ids.length > 0 ? (
                <div className={styles.row}>
                    <span className={styles.label}>势力</span>
                    <span className={styles.value}>{factionNames}</span>
                </div>
            ) : null}
            {event.role_ids.length > 0 ? (
                <div className={styles.row}>
                    <span className={styles.label}>角色</span>
                    <span className={styles.value}>{roleNames}</span>
                </div>
            ) : null}
            {event.description ? (
                <div className={styles.description}>{event.description}</div>
            ) : null}
        </>
    );
}

export default function EventTip(props: IEventTipProps) {
    const { eventId, position } = props;
    const { timelineEvents } = useContext(GraphDataContext);
    const rootRef = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState({ left: 0, top: 0 });
    const [viewportRev, setViewportRev] = useState(0);

    const event = useMemo(() => {
        if (eventId == null) return null;
        return timelineEvents.find((e) => e.id === eventId) ?? null;
    }, [eventId, timelineEvents]);

    useEffect(() => {
        const bump = () => setViewportRev((n) => n + 1);
        window.addEventListener('resize', bump);
        window.addEventListener('scroll', bump, true);
        return () => {
            window.removeEventListener('resize', bump);
            window.removeEventListener('scroll', bump, true);
        };
    }, []);

    useLayoutEffect(() => {
        if (eventId == null || event == null) return;

        const el = rootRef.current;
        if (!el) return;

        setBox(clampTipPosition(el, position.clientX, position.clientY));
    }, [eventId, event, position.clientX, position.clientY, viewportRev]);

    if (eventId == null || event == null) {
        return null;
    }

    return (
        <div
            ref={rootRef}
            className={styles.root}
            style={{ left: box.left, top: box.top }}
            role="tooltip"
        >
            <EventTipBody event={event} />
        </div>
    );
}
