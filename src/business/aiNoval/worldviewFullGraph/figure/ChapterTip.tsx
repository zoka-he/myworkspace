'use client';

import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { EventManage2DataContext } from '../context';
import { useFactions, useGeos, useRoles, useStoryLines, useWorldViewData } from '../hooks';
import { TimelineDateFormatter } from '../../common/novelDateUtils';
import type { IChapter } from '@/src/types/IAiNoval';
import styles from './EventTip.module.scss';

const POINTER_GAP = 12;
const VIEW_MARGIN = 8;

interface IChapterTipProps {
    chapterId: number | null;
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

function ChapterTipBody({ chapter }: { chapter: IChapter }) {
    const [worldViewData] = useWorldViewData();
    const [storyLineList] = useStoryLines();
    const [geoList] = useGeos();
    const [roleList] = useRoles();
    const [factionList] = useFactions();

    const chapterNo = chapter.chapter_number ?? chapter.id;
    const title = chapter.title?.trim() ? chapter.title : (chapterNo ? `第${chapterNo}章` : `章节 #${chapter.id ?? '-'}`);

    const dateText = useMemo(() => {
        if (chapter.time_in_worldview == null) return '未设置';
        if (!worldViewData) return String(chapter.time_in_worldview);
        return TimelineDateFormatter.fromWorldViewWithExtra(worldViewData).formatSecondsToDate(chapter.time_in_worldview);
    }, [worldViewData, chapter.time_in_worldview]);

    const storyLineNames = useMemo(() => {
        const ids = chapter.storyline_ids ?? [];
        if (!ids.length) return '';
        return ids.map((id) => {
            const line = storyLineList.find((s) => s.id === id);
            return line?.name ?? `故事线 #${id}`;
        }).join(' | ');
    }, [storyLineList, chapter.storyline_ids]);

    const geoNames = useMemo(() => {
        const ids = chapter.geo_ids ?? [];
        if (!ids.length) return '';
        return ids.map((code) => {
            const geo = geoList.find((g) => g.code === code);
            return geo?.name ?? `地点 #${code}`;
        }).join(' | ');
    }, [geoList, chapter.geo_ids]);

    const factionNames = useMemo(() => {
        const ids = chapter.faction_ids ?? [];
        if (!ids.length) return '';
        return ids.map((id) => {
            const faction = factionList.find((f) => f.id === id);
            return faction?.name ?? `势力 #${id}`;
        }).join(' | ');
    }, [factionList, chapter.faction_ids]);

    const roleNames = useMemo(() => {
        const ids = chapter.role_ids ?? [];
        if (!ids.length) return '';
        return ids.map((rawId) => {
            const idText = String(rawId).includes('|') ? String(rawId).split('|')[1].trim() : String(rawId);
            const id = Number.parseInt(idText, 10);
            const role = Number.isFinite(id) ? roleList.find((r) => r.id === id) : null;
            return role?.name ?? `角色 #${idText}`;
        }).join(' | ');
    }, [roleList, chapter.role_ids]);

    const summaryText = chapter.summary?.trim() || chapter.actual_seed_prompt?.trim() || chapter.seed_prompt?.trim() || '';

    return (
        <>
            <div className={styles.title}>{title}</div>
            <div className={styles.meta}>
                <span>{dateText}</span>
                {chapterNo ? (
                    <>
                        <span className={styles.dot}>·</span>
                        <span>{`第${chapterNo}章`}</span>
                    </>
                ) : null}
            </div>
            {storyLineNames ? (
                <div className={styles.row}>
                    <span className={styles.label}>故事线</span>
                    <span className={styles.value}>{storyLineNames}</span>
                </div>
            ) : null}
            {geoNames ? (
                <div className={styles.row}>
                    <span className={styles.label}>地点</span>
                    <span className={styles.value}>{geoNames}</span>
                </div>
            ) : null}
            {factionNames ? (
                <div className={styles.row}>
                    <span className={styles.label}>势力</span>
                    <span className={styles.value}>{factionNames}</span>
                </div>
            ) : null}
            {roleNames ? (
                <div className={styles.row}>
                    <span className={styles.label}>角色</span>
                    <span className={styles.value}>{roleNames}</span>
                </div>
            ) : null}
            {summaryText ? (
                <div className={styles.description}>{summaryText}</div>
            ) : null}
        </>
    );
}

export default function ChapterTip(props: IChapterTipProps) {
    const { chapterId, position } = props;
    const { chapterList } = useContext(EventManage2DataContext);
    const rootRef = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState({ left: 0, top: 0 });
    const [viewportRev, setViewportRev] = useState(0);

    const chapter = useMemo(() => {
        if (chapterId == null) return null;
        return chapterList.find((c) => c.id === chapterId) ?? null;
    }, [chapterId, chapterList]);

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
        if (chapterId == null || chapter == null) return;

        const el = rootRef.current;
        if (!el) return;

        setBox(clampTipPosition(el, position.clientX, position.clientY));
    }, [chapterId, chapter, position.clientX, position.clientY, viewportRev]);

    if (chapterId == null || chapter == null) {
        return null;
    }

    return (
        <div
            ref={rootRef}
            className={styles.root}
            style={{ left: box.left, top: box.top }}
            role="tooltip"
        >
            <ChapterTipBody chapter={chapter} />
        </div>
    );
}
