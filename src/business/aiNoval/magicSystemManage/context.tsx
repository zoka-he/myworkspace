import { createContext, useReducer, useContext } from "react";
import { IWorldViewData, IMagicSystemDef, IMagicSystemVersion } from "@/src/types/IAiNoval";

interface MagicSystemManageContextData {
    worldviewList: IWorldViewData[];
    selectedWorldviewId: number | null;
    magicSystemList: IMagicSystemDef[];
    selectedMagicSystemId: number | null;
    magicSystemVersions: IMagicSystemVersion[];
    versionListMap: Record<number, IMagicSystemVersion[]>; // 版本列表映射，key为系统ID
    selectedVersionId: number | null;
    loading: boolean;
}

function defaultContextData(): MagicSystemManageContextData {
    return {
        worldviewList: [],
        selectedWorldviewId: null,
        magicSystemList: [],
        selectedMagicSystemId: null,
        magicSystemVersions: [],
        versionListMap: {},
        selectedVersionId: null,
        loading: false,
    }
}

interface ContextValue {
    state: MagicSystemManageContextData;
    dispatch: (action: any) => void;
}

const MagicSystemManageContext = createContext<ContextValue>({
    state: defaultContextData(),
    dispatch: () => {}
});
  
function reducer(state: MagicSystemManageContextData, action: any): MagicSystemManageContextData {
    switch (action.type) {
        case 'SET_WORLDVIEW_LIST':
            return { ...state, worldviewList: action.payload };
        case 'SET_SELECTED_WORLDVIEW_ID':
            return { ...state, selectedWorldviewId: action.payload, selectedMagicSystemId: null, selectedVersionId: null };
        case 'SET_MAGIC_SYSTEM_LIST':
            return { ...state, magicSystemList: action.payload };
        case 'SET_SELECTED_MAGIC_SYSTEM_ID':
            return { ...state, selectedMagicSystemId: action.payload, selectedVersionId: null };
        case 'SET_MAGIC_SYSTEM_VERSIONS':
            return { 
                ...state, 
                magicSystemVersions: action.payload,
                versionListMap: action.systemId ? {
                    ...state.versionListMap,
                    [action.systemId]: action.payload
                } : state.versionListMap
            };
        case 'SET_VERSION_LIST_MAP':
            return { ...state, versionListMap: action.payload };
        case 'SET_SELECTED_VERSION_ID':
            return { ...state, selectedVersionId: action.payload };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'ADD_MAGIC_SYSTEM':
            return { ...state, magicSystemList: [...state.magicSystemList, action.payload] };
        case 'UPDATE_MAGIC_SYSTEM':
            return {
                ...state,
                magicSystemList: state.magicSystemList.map(item =>
                    item.id === action.payload.id ? action.payload : item
                )
            };
        case 'DELETE_MAGIC_SYSTEM':
            return {
                ...state,
                magicSystemList: state.magicSystemList.filter(item => item.id !== action.payload)
            };
        case 'ADD_VERSION':
            const newVersions = [action.payload, ...state.magicSystemVersions];
            return { 
                ...state, 
                magicSystemVersions: newVersions,
                versionListMap: action.systemId ? {
                    ...state.versionListMap,
                    [action.systemId]: newVersions
                } : state.versionListMap
            };
        case 'UPDATE_VERSION':
            const updatedVersions = state.magicSystemVersions.map(item =>
                item.id === action.payload.id ? action.payload : item
            );
            const updatedMap = { ...state.versionListMap };
            // 更新所有包含该版本的系统列表
            Object.keys(updatedMap).forEach(key => {
                const systemId = Number(key);
                updatedMap[systemId] = updatedMap[systemId].map(item =>
                    item.id === action.payload.id ? action.payload : item
                );
            });
            return {
                ...state,
                magicSystemVersions: updatedVersions,
                versionListMap: updatedMap
            };
        case 'DELETE_VERSION':
            const filteredVersions = state.magicSystemVersions.filter(item => item.id !== action.payload);
            const filteredMap = { ...state.versionListMap };
            // 从所有系统的版本列表中删除该版本
            Object.keys(filteredMap).forEach(key => {
                const systemId = Number(key);
                filteredMap[systemId] = filteredMap[systemId].filter(item => item.id !== action.payload);
            });
            return {
                ...state,
                magicSystemVersions: filteredVersions,
                versionListMap: filteredMap
            };
        default:
            return state;
    }
}

export default function MagicSystemManageContextProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(reducer, defaultContextData());
    return (
        <MagicSystemManageContext.Provider value={{ state, dispatch }}>
            {children}
        </MagicSystemManageContext.Provider>
    )
}

export function useMagicSystemManage() {
    return useContext(MagicSystemManageContext);
}

export function useWorldviewList() {
    const { state, dispatch } = useMagicSystemManage();
    return [
        state.worldviewList,
        (worldviewList: IWorldViewData[]) => {
            dispatch({ type: 'SET_WORLDVIEW_LIST', payload: worldviewList });
        }
    ] as const;
}

export function useSelectedWorldviewId() {
    const { state, dispatch } = useMagicSystemManage();
    return [
        state.selectedWorldviewId,
        (selectedWorldviewId: number | null) => {
            dispatch({ type: 'SET_SELECTED_WORLDVIEW_ID', payload: selectedWorldviewId });
        }
    ] as const;
}

export function useVersionListMap() {
    const { state } = useMagicSystemManage();
    return state.versionListMap;
}