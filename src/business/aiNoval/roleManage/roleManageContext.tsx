import { IRoleData, IRoleInfo, IWorldViewData } from "@/src/types/IAiNoval";
import { createContext, Dispatch, ReactNode, useContext, useEffect, useMemo, useReducer, useCallback, useRef } from "react";
import { getWorldViews } from "../common/worldViewUtil";
import apiCalls from "./apiCalls";
import { IFactionDefData } from "@/src/types/IAiNoval";
import { getFactionList } from "@/src/api/aiNovel";
import { fetchChromaMetadata } from "@/src/api/chroma";
import SparkMD5 from "spark-md5";

/**
 * 计算角色信息的 fingerprint
 * 与 roleInfoService.js 中的 SQL 逻辑保持一致:
 * md5(concat_ws('|', name_in_worldview, gender_in_worldview, f_root.name, personality, background))
 */
export function calculateRoleInfoFingerprint(
    roleInfo: IRoleInfo, 
    factionMap: Map<number, IFactionDefData>
): string {
    // 模拟mysql的一致化行为
    // const rootFactionName = roleInfo.root_faction_id 
    //     ? factionMap.get(roleInfo.root_faction_id)?.name
    //     : null;
    
    // 使用 '|' 连接各字段，与 MySQL 的 concat_ws 行为一致
    const parts = [
        // roleInfo.name_in_worldview,
        // roleInfo.gender_in_worldview,
        // rootFactionName,
        // roleInfo.personality,
        // roleInfo.background,
        roleInfo.embed_document,
    ];
    
    
    const documentStr = parts
        .filter(item => item !== null && item !== undefined)
        .map(item => item || '')
        .join('|'); // 模拟 MySQL 的一致化行为

    // console.debug('documentStr ------------->> ', documentStr);
    return SparkMD5.hash(documentStr);
}

/**
 * 带 fingerprint 的角色信息
 */
export interface IRoleInfoWithFingerprint extends IRoleInfo {
    fingerprint?: string;
}

/**
 * Chroma 中存储的角色 metadata 结构
 */
export interface IRoleChromaMetadata {
    id: string;
    metadata: {
        role_id?: number;
        role_info_id?: number;
        name?: string;
        version_name?: string;
        worldview_id?: number;
        faction_id?: number;
        [key: string]: any;
    };
}

interface RoleManageContextData {
    worldViewId: number | null;
    worldViewList: IWorldViewData[];
    roleId: number | null;
    roleDefList: IRoleData[];
    roleInfoId: number | null;
    roleInfoList: IRoleInfo[];
    factionList: IFactionDefData[];
    roleChromaMetadataList: IRoleChromaMetadata[];
}

type RoleManageAction = { type: string; payload: any };

interface RoleManageContextProviderProps {
    children: ReactNode;
}

function defaultContextData(): RoleManageContextData {
    return {
        worldViewId: null,
        worldViewList: [],
        roleId: null,
        roleDefList: [],
        roleInfoId: null,
        roleInfoList: [],
        factionList: [],
        roleChromaMetadataList: [],
    }
}

export const reducerContext = createContext<RoleManageContextData>(defaultContextData());
export const reducerDispatch = createContext<Dispatch<RoleManageAction>>(() => {});

export default function RoleManageContextProvider({ children }: RoleManageContextProviderProps) {

    const [values, dispatch] = useReducer(reducer, defaultContextData())

    // 初始化全局
    useEffect(() => {
        init();
    }, []);

    useEffect(() => {
        if (values.worldViewId) {
            handleWorldViewChange(values.worldViewId);
        }
    }, [values.worldViewId]);

    async function init() {
        let worldViewList = await getWorldViews();
        dispatch({ type: 'SET_WORLD_VIEW_LIST', payload: worldViewList.data });

        if (worldViewList.data.length > 0) {
            let worldViewId = worldViewList.data[0].id;
            dispatch({ type: 'SET_WORLD_VIEW_ID', payload: worldViewId });
            await handleWorldViewChange(worldViewId!);
        }
    }

    async function handleWorldViewChange(worldViewId: number | null) {
        await loadFactionList(dispatch, worldViewId);
        await loadRoleChromaMetadataList(dispatch, worldViewId);
    }

    return (
        <reducerContext.Provider value={values}>
            <reducerDispatch.Provider value={dispatch}>
                {children}
            </reducerDispatch.Provider>
        </reducerContext.Provider>
    )
}

function reducer(prevState: RoleManageContextData, action: RoleManageAction): RoleManageContextData {
    switch (action.type) {
        case 'SET_WORLD_VIEW_ID':
            return { ...prevState, worldViewId: action.payload };
        case 'SET_WORLD_VIEW_LIST':
            return { ...prevState, worldViewList: action.payload };
        case 'SET_ROLE_ID':
            return { ...prevState, roleId: action.payload };
        case 'SET_ROLE_DEF_LIST':
            return { ...prevState, roleDefList: action.payload };
        case 'SET_ROLE_INFO_ID':
            return { ...prevState, roleInfoId: action.payload };
        case 'SET_ROLE_INFO_LIST':
            return { ...prevState, roleInfoList: action.payload };
        case 'SET_FACTION_LIST':
            return { ...prevState, factionList: action.payload };
        case 'SET_ROLE_CHROMA_METADATA_LIST':
            return { ...prevState, roleChromaMetadataList: action.payload };
        default:
            return prevState;
    }
}

export function useWorldViewId() {
    const { worldViewId } = useContext(reducerContext);
    const dispatch = useContext(reducerDispatch);

    return [
        worldViewId,
        (worldViewId: number | null) => {
            dispatch({ type: 'SET_WORLD_VIEW_ID', payload: worldViewId });
        },
    ] as const;
}

export function useWorldViewList() {
    const { worldViewList } = useContext(reducerContext);
    const dispatch = useContext(reducerDispatch);

    return [
        worldViewList,
        (worldViewList: IWorldViewData[]) => {
            dispatch({ type: 'SET_WORLD_VIEW_LIST', payload: worldViewList });
        },
    ] as const;
}

export function useLoadWorldViewList() {
    const dispatch = useContext(reducerDispatch);

    return async () => {
        let worldViewList = await getWorldViews();
        dispatch({ type: 'SET_WORLD_VIEW_LIST', payload: worldViewList.data });
    }
}

export function useRoleId() {
    const { roleId } = useContext(reducerContext);
    const dispatch = useContext(reducerDispatch);

    return [
        roleId,
        (roleId: number | null) => {
            dispatch({ type: 'SET_ROLE_ID', payload: roleId });
        },
    ] as const;
}

export function useRoleDefList() {
    const { roleDefList } = useContext(reducerContext);
    const dispatch = useContext(reducerDispatch);

    return [
        roleDefList,
        (roleDefList: IRoleData[]) => {
            dispatch({ type: 'SET_ROLE_DEF_LIST', payload: roleDefList });
        },
    ] as const;
}

export function useRoleDef() {
    const { roleId } = useContext(reducerContext);
    const { roleDefList } = useContext(reducerContext);
    return useMemo(() => {
        return roleDefList.find(info => info.id === roleId) || null;
    }, [roleId, roleDefList]);
}

export function useLoadRoleDefList() {
    const { worldViewId } = useContext(reducerContext);
    const dispatch = useContext(reducerDispatch);
    return async () => {
        if (worldViewId === null) {
            dispatch({ type: 'SET_ROLE_DEF_LIST', payload: [] });
            return;
        }
        let roleDefList = await apiCalls.getRoleList(worldViewId);
        dispatch({ type: 'SET_ROLE_DEF_LIST', payload: roleDefList.data });
        return roleDefList.data;
    }
}

export function useRoleInfoId() {
    const { roleInfoId } = useContext(reducerContext);
    const dispatch = useContext(reducerDispatch);

    return [
        roleInfoId,
        (roleInfoId: number | null) => {
            dispatch({ type: 'SET_ROLE_INFO_ID', payload: roleInfoId });
        },
    ] as const;
}

export function useRoleInfoList() {
    const { roleInfoList } = useContext(reducerContext);
    const dispatch = useContext(reducerDispatch);

    return [
        roleInfoList,
        (roleInfoList: IRoleInfo[]) => {
            dispatch({ type: 'SET_ROLE_INFO_LIST', payload: roleInfoList });
        },
    ] as const;
}

export function useRoleInfo() {
    const { roleInfoId } = useContext(reducerContext);
    const { roleInfoList } = useContext(reducerContext);
    return useMemo(() => {
        return roleInfoList.find(info => info.id === roleInfoId) || null;
    }, [roleInfoId, roleInfoList]);
}

export function useLoadRoleInfoList() {
    const { worldViewId } = useContext(reducerContext);
    const dispatch = useContext(reducerDispatch);

    return async () => {
        console.warn('[useLoadRoleInfoList] called, worldViewId:', worldViewId);
        console.trace('[useLoadRoleInfoList] call stack');
        if (worldViewId === null) {
            dispatch({ type: 'SET_ROLE_INFO_LIST', payload: [] });
            return;
        }

        let roleInfoList = await apiCalls.getWorldViewRoleInfoList(worldViewId, 1000);
        dispatch({ type: 'SET_ROLE_INFO_LIST', payload: roleInfoList.data || [] });
        return roleInfoList.data;
    }
}

export function useFactionList() {
    const { factionList } = useContext(reducerContext);
    return [factionList] as const;
};

async function loadFactionList(dispatch: Dispatch<RoleManageAction>, worldViewId: number | null) {
    if (worldViewId === null) {
        dispatch({ type: 'SET_FACTION_LIST', payload: [] });
        return [];
    }

    let factionList = await getFactionList(worldViewId);
    dispatch({ type: 'SET_FACTION_LIST', payload: factionList.data });
    return factionList.data;
}

export function useLoadFactionList() {
    const { worldViewId } = useContext(reducerContext);
    const dispatch = useContext(reducerDispatch);

    return async () => {
        let resp = await loadFactionList(dispatch, worldViewId);
        return resp.data || [];
    }
}

export function useRoleChromaMetadataList() {
    const { roleChromaMetadataList } = useContext(reducerContext);
    return [roleChromaMetadataList] as const;
}

export function useRoleChromaMetadata() {
    const { roleInfoId } = useContext(reducerContext);
    const { roleChromaMetadataList } = useContext(reducerContext);
    return useMemo(() => {
        return roleChromaMetadataList.find(info => info.id === String(roleInfoId)) || null;
    }, [roleInfoId, roleChromaMetadataList]);
}

export async function loadRoleChromaMetadataList(dispatch: Dispatch<RoleManageAction>, worldViewId: number | null) {
    
    if (worldViewId === null) {
        dispatch({ type: 'SET_ROLE_CHROMA_METADATA_LIST', payload: [] });
        return [];
    }

    try {
        const response: any = await fetchChromaMetadata({
            type: 'character',
            worldview_id: worldViewId,
        });
        
        if (response?.success) {
            const metadataList = response.data || [];
            dispatch({ type: 'SET_ROLE_CHROMA_METADATA_LIST', payload: metadataList });
            return metadataList;
        } else {
            console.error('[useLoadRoleChromaMetadataList] 获取失败:', response?.error);
            dispatch({ type: 'SET_ROLE_CHROMA_METADATA_LIST', payload: [] });
            return [];
        }
    } catch (error) {
        console.error('[useLoadRoleChromaMetadataList] 请求异常:', error);
        dispatch({ type: 'SET_ROLE_CHROMA_METADATA_LIST', payload: [] });
        return [];
    }
}

export function useLoadRoleChromaMetadataList() {
    const { worldViewId } = useContext(reducerContext);
    const dispatch = useContext(reducerDispatch);
    
    // 使用 ref 存储最新的值，避免闭包问题
    const worldViewIdRef = useRef(worldViewId);
    const dispatchRef = useRef(dispatch);
    
    // 保持 ref 为最新值
    useEffect(() => {
        worldViewIdRef.current = worldViewId;
        dispatchRef.current = dispatch;
    }, [worldViewId, dispatch]);
    
    // 使用 useCallback 返回稳定的函数引用，但内部使用 ref 获取最新值
    return useCallback(async () => {
        let data = await loadRoleChromaMetadataList(dispatchRef.current, worldViewIdRef.current);
        return data;
    }, []); // 空依赖数组，函数引用保持稳定，但内部总是使用最新的值
}
