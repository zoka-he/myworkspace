import { IWorldViewDataWithExtra } from "@/src/types/IAiNoval";
import { useContext, useEffect, useReducer, useState } from "react";
import { createContext } from "react";
import fetch from "@/src/fetch";

interface WorldviewContextState {
    worldviewList: IWorldViewDataWithExtra[];
    worldviewData: IWorldViewDataWithExtra | null;
    worldviewId: number | null;
}

interface WorldviewContextType {
    state: WorldviewContextState;
    dispatch: (action: any) => void;
    loadWorldviews: (page?: number | null, limit?: number | null) => Promise<IWorldViewDataWithExtra[]>;
    setWorldviewId: (worldviewId: number | null) => void;
}

function initialState(): WorldviewContextState {
    return {
        worldviewList: [],
        worldviewData: null,
        worldviewId: null
    }
}

const SimpleWorldviewContext = createContext<WorldviewContextType>({
    state: initialState(),
    dispatch: (action: any) => {},
    loadWorldviews: async (_page?: number | null, _limit?: number | null) => {
        return [];
    },
    setWorldviewId: (worldviewId: number | null) => {}
});

function worldviewReducer(state: WorldviewContextState, action: any): WorldviewContextState {
    switch (action.type) {
        case 'SET_WORLDVIEW_LIST': {
            let worldviewList: IWorldViewDataWithExtra[] = [];
            let matchedWorldviewData = null;
            let worldviewId = null;

            // 处理worldviewList，如果为空，自动清空worldviewData和worldviewId
            worldviewList = action.payload || [];
            if (!worldviewList?.length) {
                return {
                    ...state,
                    worldviewList,
                    worldviewData: null,
                    worldviewId: null
                }
            }

            // 如果worldviewId存在，则根据worldviewId查找worldviewData，并设置worldviewId
            if (state.worldviewId) {
                matchedWorldviewData = worldviewList.find((worldview: IWorldViewDataWithExtra) => worldview.id === state.worldviewId) || null;
                if (matchedWorldviewData) {
                    worldviewId = matchedWorldviewData.id || null;
                }
                return {
                    ...state,
                    worldviewList,
                    worldviewData: matchedWorldviewData,
                    worldviewId
                }
            }

            // 如果worldviewId不存在，则设置worldviewData为worldviewList的第一个元素，并设置worldviewId
            matchedWorldviewData = worldviewList[0] || null;
            if (matchedWorldviewData) {
                worldviewId = matchedWorldviewData.id || null;
            }
            return {
                ...state,
                worldviewList,
                worldviewData: matchedWorldviewData,
                worldviewId
            }
        }
        case 'SET_WORLDVIEW_ID': {
            let matchedWorldviewData = null;
            const worldviewId = action.payload;
            if (worldviewId && state.worldviewList.length > 0) {
                matchedWorldviewData = state.worldviewList.find((worldview: IWorldViewDataWithExtra) => worldview.id === worldviewId) || null;
            }
            return { ...state, worldviewId: worldviewId, worldviewData: matchedWorldviewData };
        }
        default:
            return state;
    }
}

function setWorldviewId(state: WorldviewContextState, dispatch: (action: any) => void, worldviewId: number | null) {
    dispatch({ type: 'SET_WORLDVIEW_ID', payload: worldviewId });
}

async function loadWorldviews(state: WorldviewContextState, dispatch: (action: any) => void, page: number = 1, limit: number = 100): Promise<IWorldViewDataWithExtra[]> {
    const response = await fetch.get('/api/aiNoval/worldView/list', { params: { page, limit } });
    const worldviewList = response.data || [];
    dispatch({ type: 'SET_WORLDVIEW_LIST', payload: worldviewList });
    return worldviewList;
}

export default function SimpleWorldviewProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(worldviewReducer, initialState());
    const [initialized, setInitialized] = useState(false);

    async function _loadWorldview(_page?: number | null, _limit?: number | null) {
        if (!_page) {
            _page = 1;
        }
        if (!_limit) {
            _limit = 100;
        }
        return loadWorldviews(state, dispatch, _page, _limit);
    }

    // 初始化
    useEffect(() => {
        async function init() {
            console.debug('worldviewProvider init... ');
            await _loadWorldview();
            setTimeout(() => {
                setInitialized(true);
                console.debug('worldviewProvider init done... ', state);
            }, 0);
        }
        init();
    }, []);

    const contextValue = { 
        state, 
        dispatch,
        loadWorldviews: _loadWorldview,
        setWorldviewId: (worldviewId: number | null) => {
            setWorldviewId(state, dispatch, worldviewId);
        }
    };

    if (!initialized) {
        return <div>Loading...</div>;
    } else {
        return (
            <SimpleWorldviewContext.Provider value={contextValue}>
                {children}
            </SimpleWorldviewContext.Provider>
        )
    }
}

export function useSimpleWorldviewContext() {
    return useContext(SimpleWorldviewContext);
}