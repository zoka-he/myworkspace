import { IGeoUnionData } from '@/src/types/IAiNoval';
import { useState, useReducer, useContext, createContext, useEffect } from 'react';
import { IGeoTreeItem } from './geoTree';
import { loadGeoUnionList, transfromGeoUnionToGeoTree } from '../common/geoDataUtil';
import { useSimpleWorldviewContext } from '../common/SimpleWorldviewProvider';

interface GeoDataState {
    geoData: IGeoUnionData[];
    geoTree: IGeoTreeItem<IGeoUnionData>[] | null;
}

interface GeoDataContextType {
    state: GeoDataState;
    dispatch: (action: any) => void;
}

interface UseGeoDataInterface extends GeoDataContextType {
    refreshGeoData: () => Promise<void>;
}

const GeoDataContext = createContext<GeoDataContextType>({
    state: getDefaultGeoDataState(),
    dispatch: () => {},
});

function getDefaultGeoDataState(): GeoDataState {
    return {
        geoData: [],
        geoTree: [],
    };
}

function geoDataReducer(state: GeoDataState, action: any): GeoDataState {
    switch (action.type) {
        case 'SET_GEO_DATA':
            return { ...state, geoData: action.payload };
        case 'SET_GEO_TREE':
            return { ...state, geoTree: action.payload };
        default:
            return state;
    }
}

async function refreshGeoData(worldviewId: number | null, dispatch: (action: any) => void) {
    if (!worldviewId) {
        console.error('worldviewId is not set');
        return;
    }

    let geoList = await loadGeoUnionList(worldviewId);
    let geoTree = transfromGeoUnionToGeoTree(geoList);

    dispatch({
        type: 'SET_GEO_DATA',
        payload: geoList,
    });
    dispatch({
        type: 'SET_GEO_TREE',
        payload: geoTree,
    });
}

export default function GeoDataProvider({ children }: { children: React.ReactNode }) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [state, dispatch] = useReducer(geoDataReducer, getDefaultGeoDataState());
    const { state: worldviewState } = useSimpleWorldviewContext();

    async function initialize() {
        if (!worldviewState.worldviewId) {
            console.error('worldviewId is not set');
            setIsInitialized(true);
            return;
        }

        await refreshGeoData(worldviewState.worldviewId, dispatch);
        setIsInitialized(true);
    }

    useEffect(() => {
        initialize();
    }, []);

    async function handleWorldviewIdChange() {
        if (!worldviewState.worldviewId) {
            dispatch({
                type: 'SET_GEO_DATA',
                payload: [],
            });
            dispatch({
                type: 'SET_GEO_TREE',
                payload: [],
            });
            return;
        }
        await refreshGeoData(worldviewState.worldviewId, dispatch);
    }

    useEffect(() => {
        handleWorldviewIdChange();
    }, [worldviewState.worldviewId]);

    if (!isInitialized) {
        return <div>Loading...</div>;
    }

    return (
        <GeoDataContext.Provider value={{ state, dispatch }}>
            {children}
        </GeoDataContext.Provider>
    );
}

export function useGeoData(): UseGeoDataInterface {
    const context = useContext(GeoDataContext);
    const { state: worldviewState } = useSimpleWorldviewContext();

    if (!context) {
        throw new Error('useGeoData must be used within a GeoDataProvider');
    }

    if (!worldviewState) {
        throw new Error('worldviewState is not set');
    }

    return {
        ...context,
        refreshGeoData: async () => {
            await refreshGeoData(worldviewState.worldviewId, context.dispatch);
        },
    };
}