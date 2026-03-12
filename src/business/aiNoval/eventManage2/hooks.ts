import { useContext } from "react";
import { EventManage2DataContext, EventManage2DispatchContext } from "./context";

export function useWorldViewId() {
    const { worldViewId } = useContext(EventManage2DataContext);
    const { dispatch } = useContext(EventManage2DispatchContext);
    return [
        worldViewId,
        (worldViewId: number | null) => {
            dispatch({ type: 'SET_WORLD_VIEW_ID', payload: worldViewId });
        }
    ] as const;
}

export function useFactions() {
    const { factionList } = useContext(EventManage2DataContext);
    return [factionList ?? []] as const;
}

export function useGeos() {
    const { geoList } = useContext(EventManage2DataContext);
    return [geoList] as const;
}

export function useEvents() {
    // const { eventList } = useContext(EventManage2DataContext);
    // return [eventList] as const;
}

export function useRoles() {
    const { roleList } = useContext(EventManage2DataContext);
    return [roleList] as const;
}

export function useRoleGroups( worldViewId: number | null ) {
    // const { roleList } = useContext(EventManage2DataContext);
    // return [roleList] as const;
}

export function useNovelId() {
    const { novelId } = useContext(EventManage2DataContext);
    const { dispatch } = useContext(EventManage2DispatchContext);
    return [
        novelId,
        (novelId: number | null) => {
            dispatch({ type: 'SET_NOVEL_ID', payload: novelId });
        }
    ] as const;
}

export function useTimelines() {
    const { timelineList } = useContext(EventManage2DataContext);
    return [timelineList] as const;
}