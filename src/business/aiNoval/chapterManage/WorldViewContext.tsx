import { createContext, useContext, useEffect, useReducer, useState } from "react";
import { IFactionDefData, IGeoUnionData, IRoleData, IWorldViewDataWithExtra } from "@/src/types/IAiNoval";
import { loadGeoUnionList } from "../common/geoDataUtil";
import * as chapterApi from './apiCalls'

interface WorldViewState {
    worldViewId?: number | null
    worldViewList?: IWorldViewDataWithExtra[]
    worldViewData?: IWorldViewDataWithExtra | null
    geoUnionList?: IGeoUnionData[]
    factionList?: IFactionDefData[]
    roleList?: IRoleData[]
}

interface WorldViewContextType {
    state: WorldViewState
    dispatch: (action: any) => void
}

function initialState(): WorldViewState {
    return {
        worldViewId: null,
        worldViewList: [],
        worldViewData: null,
        geoUnionList: [],
        factionList: [],
        roleList: [],
    }
}

export const WorldViewContext = createContext<WorldViewContextType>({
    state: initialState(),
    dispatch: () => {},
})

function worldViewReducer(state: WorldViewState, action: any) {
    switch (action.type) {
        case 'SET_SELECTED_WORLD_VIEW_ID':
            return { ...state, worldViewId: action.payload }
        case 'SET_SELECTED_WORLD_VIEW_DATA':
            console.debug('SET_SELECTED_WORLD_VIEW_DATA --> ', action.payload);
            return { 
                ...state, 
                worldViewData: action.payload.worldViewData,
                geoUnionList: action.payload.geoUnionList,
                factionList: action.payload.factionList,
                roleList: action.payload.roleList
            }
        case 'SET_WORLD_VIEW_LIST':
            return {
                ...state,
                worldViewList: action.payload.worldViewList,
            }
        default:
            return state
    }
}

async function loadWorldViews() {
    const response = await chapterApi.getWorldViewList()
    return response.data
}

export default function WorldViewContextProvider({ worldViewId, children }: { worldViewId: number | null, children: React.ReactNode }) {
    const [ state, dispatch ] = useReducer(worldViewReducer, initialState())
    // const [contextWorldViewId, setContextWorldViewId] = useState<number | null>(null)

    useEffect(() => {
        dispatch({ type: 'SET_SELECTED_WORLD_VIEW_ID', payload: worldViewId })
        loadWorldViews().then((worldViews) => {
            dispatch({
                type: 'SET_WORLD_VIEW_LIST',
                payload: {
                    worldViewList: worldViews,
                }
            })
        })
    }, [])

    useEffect(() => {
        dispatch({ type: 'SET_SELECTED_WORLD_VIEW_ID', payload: worldViewId })
        handleWorldViewChange(worldViewId, state, dispatch)
    }, [worldViewId])

    return (
        <WorldViewContext.Provider value={{ state, dispatch }}>
            {children}
        </WorldViewContext.Provider>
    )
}

// 世界观变更
const handleWorldViewChange = (worldViewId: number | null, state: WorldViewState, dispatch: (action: any) => void) => {

    if (!worldViewId) {
        console.debug('未获得worldViewId，设置为null，清空世界观数据')
        dispatch({
            type: 'SET_SELECTED_WORLD_VIEW_ID',
            payload: null
        })

        dispatch({
            type: 'SET_SELECTED_WORLD_VIEW_DATA', 
            payload: { 
                worldViewId: null,
                worldViewData: null, 
                geoUnionList: [], 
                factionList: [], 
                roleList: [] 
            }
        })
        return
    }

    dispatch({
        type: 'SET_SELECTED_WORLD_VIEW_ID',
        payload: worldViewId
    })

    const worldViewData = state.worldViewList?.find((worldView: IWorldViewDataWithExtra) => worldView.id === worldViewId) || null;

    // dispatch({
    //     type: 'SET_SELECTED_WORLD_VIEW_DATA',
    //     payload: { 
    //         worldViewData: worldViewData, 
    //         geoUnionList: null, 
    //         factionList: null, 
    //         roleList: null 
    //     }
    // })

    console.debug('更新世界观附加数据，contextWorldViewId: ', worldViewId);
    Promise.all([
        loadGeoUnionList(worldViewId),
        chapterApi.loadFactionList(worldViewId),
        chapterApi.loadRoleList(worldViewId),
    ]).then(([geoUnionList, factionList, roleList]) => {
        dispatch({
            type: 'SET_SELECTED_WORLD_VIEW_DATA',
            payload: { 
                worldViewData: worldViewData, 
                geoUnionList: geoUnionList, 
                factionList: factionList, 
                roleList: roleList 
            }
        })
    });
}

function checkWorldViewDataAndRetry(state: WorldViewState, dispatch: (action: any) => void) {
    if (!state.worldViewId) {
        return;
    }

    if (state.factionList?.length === 0 || state.geoUnionList?.length === 0 || state.roleList?.length === 0) {
        // 可能不正常，尝试重新加载
        handleWorldViewChange(state.worldViewId, state, dispatch);
    }
}


export function useWorldViewContext() {
    const { state, dispatch } = useContext(WorldViewContext)

    return {
        ...(state || {}),
        checkWorldViewDataAndRetry: () => checkWorldViewDataAndRetry(state, dispatch),
        setContextWorldViewId: (worldViewId: number | null) => handleWorldViewChange(worldViewId, state, dispatch),
    }
}