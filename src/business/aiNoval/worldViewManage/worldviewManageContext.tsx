import { IWorldViewDataWithExtra } from "@/src/types/IAiNoval";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { loadWorldviews } from "@/src/api/aiNovel";
import { RefObject } from "react";
import WorldViewInfoEditor from "./worldViewInfoEditor";

interface WorldviewManageState {
    worldviewList: IWorldViewDataWithExtra[];
    worldViewId: number | null;
    worldViewEditorRef: RefObject<WorldViewInfoEditor | null> | null;
}

function initialState(): WorldviewManageState {
    return {
        worldviewList: [],
        worldViewId: null,
        worldViewEditorRef: null,
    }
}

function worldviewManageReducer(state: WorldviewManageState, action: any) {
    switch (action.type) {
        case 'SET_WORLDVIEW_LIST':
            return {
                ...state,
                worldviewList: action.payload,
            }
        case 'SET_WORLDVIEW_ID':
            return {
                ...state,
                worldViewId: action.payload,
            }
        case 'SET_WORLDVIEW_EDITOR_REF':
            return {
                ...state,
                worldViewEditorRef: action.payload,
            }
        default:
            return state;
    }
}

const WorldviewManageContext = createContext<{
    state: WorldviewManageState;
    dispatch: (action: any) => void;
}>({
    state: initialState(),
    dispatch: () => {},
})

export default function WorldviewManageContextProvider({ children }: { children: React.ReactNode }) {
    const [ state, dispatch ] = useReducer(worldviewManageReducer, initialState())
    return (
        <WorldviewManageContext.Provider value={{ state, dispatch }}>
            {children}
        </WorldviewManageContext.Provider>
    )
}

export function useLoadWorldviewList() {
    const { state, dispatch } = useContext(WorldviewManageContext)
    const loadWorldviewList = useCallback(async () => {
        // 如果worldViewId为null，则使用当前的worldViewId
        const { data: worldviewList, count } = await loadWorldviews({}, 1, 100)
        console.debug('loadWorldviewList --> ', worldviewList, count);
        dispatch({ type: 'SET_WORLDVIEW_LIST', payload: worldviewList })
        return worldviewList;

    }, [state.worldViewId, dispatch])
    return loadWorldviewList
}

export function useWorldViewId() {
    const { state, dispatch } = useContext(WorldviewManageContext);
    return [
        state.worldViewId,
        (worldViewId: number | null) => {
            dispatch({ type: 'SET_WORLDVIEW_ID', payload: worldViewId })
        }
    ] as const;
}

export function useWorldviewList() {
    const { state, dispatch } = useContext(WorldviewManageContext);
    return [
        state.worldviewList,
        (worldviewList: IWorldViewDataWithExtra[]) => {
            dispatch({ type: 'SET_WORLDVIEW_LIST', payload: worldviewList })
        }
    ] as const;
}

export function useWorldViewData() {
    const { state } = useContext(WorldviewManageContext);

    const worldViewData = useMemo(() => {
        if (!state.worldViewId) {
            return null;
        }
        return state.worldviewList.find((worldview: IWorldViewDataWithExtra) => worldview.id === state.worldViewId) || null;
    }, [state.worldViewId, state.worldviewList])

    return [
        worldViewData,
    ] as const;
}

export function useWorldViewEditorRef() {
    const { state, dispatch } = useContext(WorldviewManageContext);
    return [
        state.worldViewEditorRef,
        (worldViewEditorRef: RefObject<WorldViewInfoEditor | null>) => {
            dispatch({ type: 'SET_WORLDVIEW_EDITOR_REF', payload: worldViewEditorRef })
        }
    ] as const;
}
