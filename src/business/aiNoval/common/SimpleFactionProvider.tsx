import { IFactionDefData } from "@/src/types/IAiNoval";
import { useSimpleWorldviewContext } from "./SimpleWorldviewProvider";
import { useContext, useEffect, useReducer } from "react";
import { createContext } from "react";
import fetch from "@/src/fetch";

interface IFactionTreeItem extends IFactionDefData {
    children: IFactionTreeItem[];
}

interface FactionContextState {
    factionList: IFactionDefData[];
    factionTree: IFactionTreeItem[];
}

interface FactionContextType {
    state: FactionContextState;
    dispatch: (action: any) => void;
}

function initialState(): FactionContextState {
    return {
        factionList: [],
        factionTree: []
    }
}

const FactionContext = createContext<FactionContextType>({
    state: initialState(),
    dispatch: (action: any) => {}
});

function factionReducer(state: FactionContextState, action: any): FactionContextState {
    switch (action.type) {
        case 'SET_FACTION_LIST':
            return { ...state, factionList: action.payload };
        case 'SET_FACTION_TREE':
            return { ...state, factionTree: action.payload };
        default:
            return state;
    }
}

async function loadFactions(state: FactionContextState, dispatch: (action: any) => void, worldViewId?: number | null): Promise<IFactionDefData[]> {
    if (!worldViewId) {
        console.debug('loadFactions... worldViewId is null, return empty array');
        return [];
    }
    const response = await fetch.get('/api/aiNoval/faction/list', { params: { worldview_id: worldViewId, page: 1, limit: 1000 } });
    const factionList = response.data || [];
    console.debug('loadFactions... factionList --> ', factionList);
    dispatch({ type: 'SET_FACTION_LIST', payload: factionList });
    dispatch({ type: 'SET_FACTION_TREE', payload: buildFactionTree(factionList) });
    return factionList;
}

function buildFactionTree(factionList: IFactionDefData[]): IFactionDefData[] {
    if (!factionList || !factionList.length) {
        return [];
    }
  
    const result: IFactionDefData[] = [];

    const factionMap = new Map(); 
    factionList.forEach(item => {
        factionMap.set(item.id, { value: item.id, title: item.name, data: item, children: [] })
    });

    factionMap.forEach((item, key) => {
        if (item.data.parent_id) {
            const parent = factionMap.get(item.data.parent_id);
            if (parent) {
                parent.children.push(item);
            } else {
                result.push(item);
            }
        } else {
            result.push(item);
        }
    });

    console.debug('buildFactionTree... result --> ', result);
    return result;
}

export default function SimpleFactionProvider({ children }: { children: React.ReactNode }) {
    const { state: worldviewState } = useSimpleWorldviewContext();
    const [state, dispatch] = useReducer(factionReducer, initialState());

    useEffect(() => {
        console.debug('SimpleFactionProvider init... worldviewId --> ', worldviewState.worldviewId);
        if (worldviewState.worldviewId) {
            loadFactions(state, dispatch, worldviewState.worldviewId);
        }
        console.debug('SimpleFactionProvider init done... ', state);
    }, [])

    useEffect(() => {
        if (worldviewState.worldviewId) {
            loadFactions(state, dispatch, worldviewState.worldviewId);
        }
    }, [worldviewState.worldviewId]);

    const factionContext = { 
        state, 
        dispatch,
        loadFactions: async (_worldViewId?: number | null) => {
            if (!_worldViewId) {
                if (worldviewState.worldviewId) {
                    _worldViewId = worldviewState.worldviewId;
                } else {
                    return [];
                }
            }
            return loadFactions(state, dispatch, _worldViewId);
        }
    };

    return (
        <FactionContext.Provider value={factionContext}>
            {children}
        </FactionContext.Provider>
    )
}

export function useSimpleFactionContext() {
    return useContext(FactionContext);
}