import { IGeoUnionData } from '@/src/types/IAiNoval';
import { useState, useReducer, useContext, createContext, useEffect } from 'react';
import { IGeoTreeItem } from './geoTree';
import { loadGeoUnionList, transfromGeoUnionToGeoTree } from '../common/geoDataUtil';
import { useSimpleWorldviewContext } from '../common/SimpleWorldviewProvider';
import { fetchChromaMetadata, fetchChromaCollectionMetadata } from "@/src/api/chroma";
import SparkMD5 from 'spark-md5';

interface GeoDataState {
    geoData: IGeoUnionData[];
    geoTree: IGeoTreeItem<IGeoUnionData>[] | null;
    geoEmbedDocuments: any[];
}

interface GeoDataContextType {
    state: GeoDataState;
    dispatch: (action: any) => void;
}

interface GeoDataDispatchContextType {
    dispatch: (action: any) => void;
}

interface UseGeoDataInterface extends GeoDataContextType {
    refreshGeoData: () => Promise<void>;
}

const GeoDataContext = createContext<GeoDataContextType>({
    state: getDefaultGeoDataState(),
    dispatch: () => {},
});

const GeoDataDispatchContext = createContext<GeoDataDispatchContextType>({
    dispatch: () => {},
});

function getDefaultGeoDataState(): GeoDataState {
    return {
        geoData: [],
        geoTree: [],
        geoEmbedDocuments: [],
    };
}

function geoDataReducer(state: GeoDataState, action: any): GeoDataState {
    switch (action.type) {
        case 'SET_GEO_DATA':
            return { ...state, geoData: action.payload };
        case 'SET_GEO_TREE':
            return { ...state, geoTree: action.payload };
        case 'SET_GEO_EMBED_DOCUMENTS':
            return { ...state, geoEmbedDocuments: action.payload };
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
    geoList.forEach(geo => {
        if (geo.embed_document) {
            geo.fingerprint = SparkMD5.hash(geo.embed_document);
        }
    });
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
        await loadGeoEmbedDocuments(worldviewState.worldviewId, dispatch);
    }

    useEffect(() => {
        handleWorldviewIdChange();
    }, [worldviewState.worldviewId]);

    if (!isInitialized) {
        return <div>Loading...</div>;
    }

    return (
        <GeoDataContext.Provider value={{ state, dispatch }}>
            <GeoDataDispatchContext.Provider value={{ dispatch }}>
                {children}
            </GeoDataDispatchContext.Provider>
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

export function useGeoTree() {
    const context = useContext(GeoDataContext);
    if (!context) {
        throw new Error('useGeoTree must be used within a GeoDataProvider');
    }

    return [
        context.state.geoTree,
    ]
}

export function useRefreshGeoData() {
    const context = useSimpleWorldviewContext();
    const { dispatch } = useContext(GeoDataDispatchContext);
    if (!context) {
        throw new Error('useRefreshGeoData must be used within a GeoDataProvider');
    }

    return async function() {
        await refreshGeoData(context.state.worldviewId, dispatch);
    };
}

export async function loadGeoEmbedDocuments(worldviewId: number | null, dispatch: (action: any) => void) {
    let response: any = await fetchChromaMetadata({
        type: 'geo',
        worldview_id: String(worldviewId),
    });
    if (response?.success) {
        dispatch({
            type: 'SET_GEO_EMBED_DOCUMENTS',
            payload: response.data || [],
        });
    }
}

export function useLoadGeoEmbedDocuments() {
    const { state: worldviewState } = useSimpleWorldviewContext();
    const { dispatch } = useContext(GeoDataDispatchContext);

    return async function() {
        await loadGeoEmbedDocuments(worldviewState.worldviewId, dispatch);
    };
}

export function useGeoEmbedDocuments() {
    const context = useContext(GeoDataContext);
    return [context.state.geoEmbedDocuments];
}