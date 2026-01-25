import { IFactionDefData, IWorldViewData } from "@/src/types/IAiNoval";
import { createContext, createElement, Dispatch, useContext, useReducer } from "react";
import apiCalls from "./apiCalls";
import { getWorldViews } from "@/src/api/aiNovel";
import { FactionEditRef } from "./edit/factionEdit";
import { fetchChromaMetadata } from "@/src/api/chroma";

interface FactionManageContextData {
    worldViewId: number | null;
    worldViewList: IWorldViewData[];
    factionList: IFactionDefData[];
    factionTree: IFactionDefData[];
    currentFactionId: number | null;
    editModalRef: React.RefObject<FactionEditRef> | null;
    factionEmbedDocuments: any[];
}

const FactionManageContext = createContext<FactionManageContextData>(defaultContextData());
const FactionManageDispatchContext = createContext<Dispatch<FactionManageAction>>(() => {});

function defaultContextData(): FactionManageContextData {
    return {
        worldViewId: null,
        worldViewList: [],
        factionList: [],
        factionTree: [],
        currentFactionId: null,
        editModalRef: null,
        factionEmbedDocuments: []
    }
}

interface FactionManageAction {
    type: 'SET_WORLD_VIEW_ID' | 
        'SET_WORLD_VIEW_LIST' | 
        'SET_FACTION_LIST' | 
        'SET_FACTION_TREE' | 
        'SET_CURRENT_FACTION_ID' |
        'SET_EDIT_MODAL_REF' |
        'SET_FACTION_EMBED_DOCUMENTS';
    payload: any;
}

function reducer(state: FactionManageContextData, action: FactionManageAction) {
    switch (action.type) {
        case 'SET_WORLD_VIEW_ID':
            return { ...state, worldViewId: action.payload };
        case 'SET_WORLD_VIEW_LIST':
            return { ...state, worldViewList: action.payload };
        case 'SET_FACTION_LIST':
            return { ...state, factionList: action.payload };
        case 'SET_FACTION_TREE':
            return { ...state, factionTree: action.payload };
        case 'SET_CURRENT_FACTION_ID':
            return { ...state, currentFactionId: action.payload };
        case 'SET_EDIT_MODAL_REF':
            return { ...state, editModalRef: action.payload };
        case 'SET_FACTION_EMBED_DOCUMENTS':
            return { ...state, factionEmbedDocuments: action.payload };
    }
}


export default function FactionManageContextProvider({ children }: { children: React.ReactNode }) {
    const [values, dispatch] = useReducer(reducer, defaultContextData());

    return createElement(
        FactionManageContext.Provider, { value: values }, 
        createElement(FactionManageDispatchContext.Provider, { value: dispatch }, children)
    );
};

export function useLoadWorldViewList() {
    const dispatch = useContext(FactionManageDispatchContext);
    return async () => {
        const response = await getWorldViews();
        dispatch({ type: 'SET_WORLD_VIEW_LIST', payload: response.data });
        return response.data;
    };
}

export function useLoadFactionList() {
    const { worldViewId } = useContext(FactionManageContext);
    const dispatch = useContext(FactionManageDispatchContext);
    return async () => {
        if (!worldViewId) return;
        const response = await apiCalls.getFactionList(worldViewId);
        const list = (response.data || []) as IFactionDefData[];
        const tree = apiCalls.convertFactionListToTree(list);

        dispatch({ type: 'SET_FACTION_LIST', payload: list });
        dispatch({ type: 'SET_FACTION_TREE', payload: tree });

        return { list, tree };
    }
}

export function useWorldViewId() {
    const { worldViewId } = useContext(FactionManageContext);
    const dispatch = useContext(FactionManageDispatchContext);
    return [
        worldViewId,
        (worldViewId: number | null) => {
            dispatch({ type: 'SET_WORLD_VIEW_ID', payload: worldViewId });
        }
    ] as const;
}

export function useWorldViewList() {
    const { worldViewList } = useContext(FactionManageContext);
    const dispatch = useContext(FactionManageDispatchContext);
    return [
        worldViewList,
        (worldViewList: IWorldViewData[]) => {
            dispatch({ type: 'SET_WORLD_VIEW_LIST', payload: worldViewList });
        }
    ] as const;
}

export function useFactionList() {
    const { factionList } = useContext(FactionManageContext);
    const dispatch = useContext(FactionManageDispatchContext);

    return [
        factionList,
        (factionList: IFactionDefData[]) => {
            dispatch({ type: 'SET_FACTION_LIST', payload: factionList });
        }
    ] as const;
}

export function useFactionTree() {
    const { factionTree } = useContext(FactionManageContext);
    const dispatch = useContext(FactionManageDispatchContext);

    return [
        factionTree,
        (factionTree: IFactionDefData[]) => {
            dispatch({ type: 'SET_FACTION_TREE', payload: factionTree });
        }
    ] as const;
}

export function useCurrentFactionId() {
    const { currentFactionId } = useContext(FactionManageContext);
    const dispatch = useContext(FactionManageDispatchContext);

    return [
        currentFactionId,
        (currentFactionId: number | null) => {
            dispatch({ type: 'SET_CURRENT_FACTION_ID', payload: currentFactionId });
        }
    ] as const;
}

export function useCurrentFaction() {
    const { currentFactionId, factionList } = useContext(FactionManageContext);
    return factionList.find((faction) => faction.id === currentFactionId);
}

export function useSetEditModalRef() {
    const dispatch = useContext(FactionManageDispatchContext);
    return (editModalRef: React.RefObject<FactionEditRef | null> | null) => {
        dispatch({ type: 'SET_EDIT_MODAL_REF', payload: editModalRef });
    }
}

export function useGetEditModal() {
    const { editModalRef } = useContext(FactionManageContext);
    return () => editModalRef?.current ?? null;
}

export async function loadFactionEmbedDocuments(worldviewId: number | null, dispatch: Dispatch<FactionManageAction>) {
    if (!worldviewId) return;
    let response: any = await fetchChromaMetadata({
        type: 'faction',
        worldview_id: String(worldviewId),
    });
    if (response?.success) {
        dispatch({
            type: 'SET_FACTION_EMBED_DOCUMENTS',
            payload: response.data || [],
        });
    }

    return response.data || [];
}

export function useLoadFactionEmbedDocuments() {
    const { worldViewId } = useContext(FactionManageContext);
    const dispatch = useContext(FactionManageDispatchContext);
    return async function(userWorldViewId?: number | null) {
        return await loadFactionEmbedDocuments(userWorldViewId || worldViewId, dispatch);
    };
}

export function useFactionEmbedDocuments() {
    const { factionEmbedDocuments } = useContext(FactionManageContext);
    return [factionEmbedDocuments] as const;
}
