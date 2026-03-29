import { createContext, useMemo, useReducer } from "react";
import useSWR from "swr";
import { getFactionList, getRoleOptionsForWorldState, getChapterList, getTimelineDefList, getWorldViewList, getStoryLineList, getFactionTerritoryList } from '@/src/api/aiNovel';
import { IFactionDefData, IGeoUnionData, IRoleData, IChapter, ITimelineDef, IWorldViewDataWithExtra, IStoryLine, IFactionTerritory } from "@/src/types/IAiNoval";
import { IGeoTreeItem, loadGeoTree } from "@/src/business/aiNoval/common/geoDataUtil";
import _ from "lodash";

interface EventManage2ContextType {
    worldViewId: number | null;
    novelId: number | null;
    storyLineIds: number[];
    factionList: IFactionDefData[];
    geoTree: IGeoTreeItem<IGeoUnionData>[];
    geoList: IGeoUnionData[];
    roleList: IRoleData[];
    chapterList: IChapter[];
    timelineList: ITimelineDef[];
    worldViewData: IWorldViewDataWithExtra | null;
    storyLineList: IStoryLine[];
    territoryList: IFactionTerritory[];
}

interface EventManage2DispatchType {
    dispatch: (action: any) => void;
}

function defaultContextData(): EventManage2ContextType {
    return {
        worldViewId: null,
        novelId: null,
        storyLineIds: [],
        factionList: [],
        geoTree: [],
        geoList: [],
        roleList: [],
        chapterList: [],
        timelineList: [],
        worldViewData: null,
        storyLineList: [],
        territoryList: [],
    }
}

export const EventManage2DataContext = createContext<EventManage2ContextType>(defaultContextData());
export const EventManage2DispatchContext = createContext<EventManage2DispatchType>({
    dispatch: () => {},
});

function eventManage2Reducer(state: EventManage2ContextType, action: any): EventManage2ContextType {
    switch (action.type) {
        case 'SET_WORLD_VIEW_ID':
            return { ...state, worldViewId: action.payload };
        case 'SET_NOVEL_ID':
            return { ...state, novelId: action.payload };
        case 'SET_STORY_LINE_IDS':
            return { ...state, storyLineIds: action.payload };
        default:
            return state;
    }
}

export default function EventManage2ContextProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(eventManage2Reducer, defaultContextData());

    const { data: worldviewData, isLoading: isLoadingWorldview, error: errorWorldview } = useSWR(
        state.worldViewId ? ['worldview-data', state.worldViewId] : null,
        async () => {
            if (!state.worldViewId) return null;
            const response = await getWorldViewList(state.worldViewId);
            return response.data?.[0] ?? null;
        }
    );

    const { data: factionList, isLoading: isLoadingFactions, error: errorFactions } = useSWR(
        state.worldViewId ? ['faction-list', state.worldViewId] : null, 
        async () => {
            if (!state.worldViewId) return [];
            const response = await getFactionList(state.worldViewId);
            return response.data ?? [];
        }
    );

    const { data: geoTree, isLoading: isLoadingGeos, error: errorGeos } = useSWR(
        state.worldViewId ? ['geo-list', state.worldViewId] : null, 
        async () => {
            if (!state.worldViewId) return [];
            const response = await loadGeoTree(state.worldViewId);
            return response ?? [];
        }
    );

    const { data: roleList, isLoading: isLoadingRoles, error: errorRoles } = useSWR(
        state.worldViewId ? ['role-list', state.worldViewId] : null, 
        async () => {
            if (!state.worldViewId) return [];
            const response = await getRoleOptionsForWorldState(state.worldViewId);
            return response ?? [];
        }
    );

    const { data: chapterList, isLoading: isLoadingChapters, error: errorChapters } = useSWR(
        state.novelId ? ['chapter-list', state.novelId] : null,
        async () => {
            if (!state.novelId) return [];
            const response = await getChapterList(state.novelId);
            return response.data ?? [];
        }
    )

    const { data: timelineList, isLoading: isLoadingTimelines, error: errorTimelines } = useSWR(    
        state.worldViewId ? ['timeline-list', state.worldViewId] : null,
        async () => {
            if (!state.worldViewId) return [];
            const response = await getTimelineDefList(state.worldViewId);
            return response?.data ?? [];
        }
    );

    const geoList = useMemo(() => {
        function toPlain(tree: IGeoTreeItem<IGeoUnionData>): IGeoUnionData[] {
            let children: IGeoUnionData[] = [];

            if (tree.children) {
                children = tree.children.flatMap(toPlain);
                children.forEach(item => { 
                    if (!item.parent_id) {
                        item.parent_id = tree.data.id; 
                    }
                });
            }

            return [tree.data, ...children];
        }

        return (geoTree ?? []).flatMap(toPlain);
    }, [geoTree]);

    const { data: storyLineList, isLoading: isLoadingStoryLines, error: errorStoryLines } = useSWR(
        state.worldViewId ? ['story-line-list', state.worldViewId] : null,
        async () => {
            if (!state.worldViewId) return [];
            const response = await getStoryLineList(state.worldViewId);
            return response.data ?? [];
        }
    );

    const { data: territoryList, isLoading: isLoadingTerritories, error: errorTerritories } = useSWR(
        state.worldViewId ? ['territory-list', state.worldViewId] : null,
        async () => {
            if (!state.worldViewId) return [];
            const response = await getFactionTerritoryList(state.worldViewId, 1, 1000);
            // console.debug('territoryList --->> ', response);
            return response ?? [];
        }
    );

    return (
        <EventManage2DataContext.Provider 
            value={{ 
                ...state, 
                factionList, 
                geoTree: geoTree ?? [], 
                geoList,
                roleList: roleList ?? [], 
                chapterList: chapterList ?? [],
                timelineList: timelineList ?? [],
                worldViewData: worldviewData ?? null,
                storyLineList: storyLineList ?? [],
                territoryList: territoryList ?? [],
            }}
        >
            <EventManage2DispatchContext.Provider value={{ dispatch }}>
                {children}
            </EventManage2DispatchContext.Provider>
        </EventManage2DataContext.Provider>
    )
}