import { IGeoUnionData } from "@/src/types/IAiNoval";
import { createContext, useContext, useReducer } from "react";
import { IGeoTreeItem } from "./geoTree";
import { useGeoData } from "./GeoDataProvider";

interface ManageState {
    treeRaisedObject: IGeoTreeItem<IGeoUnionData> | null;
    objectType: string | null;
    objectCode: string | null;
}

interface ManageStateContextType {
    state: ManageState;
    dispatch: (action: any) => void;
}

interface ManageDispatchContextType {
    dispatch: (action: any) => void;
}

interface UseManageStateInterface extends ManageStateContextType {
    setTreeRaisedObject: (obj: IGeoTreeItem<IGeoUnionData> | null) => void;
}

function getDefaultManageState(): ManageState {
    return {
        treeRaisedObject: null,
        objectType: null,
        objectCode: null,
    };
}

function manageStateReducer(state: ManageState, action: any): ManageState {
    switch (action.type) {
        case 'SET_TREE_RAISED_OBJECT':
            return { ...state, treeRaisedObject: action.payload };
        case 'SET_OBJECT_TYPE':
            return { ...state, objectType: action.payload };
        case 'SET_OBJECT_CODE':
            return { ...state, objectCode: action.payload };
        default:
            return state;
    }
}

const ManageStateContext = createContext<ManageStateContextType>({
    state: getDefaultManageState(),
    dispatch: () => {}
});

const ManageDispatchContext = createContext<ManageDispatchContextType>({
    dispatch: () => {}
});

export default function ManageStateProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(manageStateReducer, getDefaultManageState());

    const contextValue: ManageStateContextType = {
        state,
        dispatch: (action: any) => dispatch(action)
    }

    return (
        <ManageStateContext.Provider value={contextValue}>
            <ManageDispatchContext.Provider value={{ dispatch }}>
                {children}
            </ManageDispatchContext.Provider>
        </ManageStateContext.Provider>
    )
}

function setTreeRaisedObject(dispatch: (action: any) => void, obj: IGeoTreeItem<IGeoUnionData> | null) {
    dispatch({
        type: 'SET_TREE_RAISED_OBJECT',
        payload: obj
    })
}

export function useManageState(): UseManageStateInterface {
    const context = useContext(ManageStateContext);
    if (!context) {
        throw new Error('useManageState must be used within a ManageStateProvider');
    }
    return {
        ...context,
        setTreeRaisedObject: (obj: IGeoTreeItem<IGeoUnionData> | null) => setTreeRaisedObject(context.dispatch, obj)
    };
}

export function useObjectType(): [string | null, (type: string) => void] {
    const context = useContext(ManageStateContext);
    const { dispatch } = useContext(ManageDispatchContext);

    return [
        context.state.objectType,
        (type: string) => dispatch?.({ type: 'SET_OBJECT_TYPE', payload: type })
    ]
}

export function useObjectCode(): [string | null, (code: string) => void] {
    const context = useContext(ManageStateContext);
    const { dispatch } = useContext(ManageDispatchContext);
    return [
        context.state.objectCode,
        (code: string) => dispatch?.({ type: 'SET_OBJECT_CODE', payload: code })
    ]
}

export function useObject() {
    const { state: manageState } = useManageState();
    const { state: geoDataState } = useGeoData();

    console.log('objectCode', manageState?.objectCode);
    console.log('geoData', geoDataState.geoData);

    if (!manageState.objectCode) {
        return [null];
    }

    if (!geoDataState.geoData) {
        return [null];
    }

    let selectedObject = geoDataState.geoData.find(item => item.code === manageState.objectCode) || null;
    console.log('selectedObject', selectedObject);

    return [selectedObject] as const;
}

export function isParentObject() {
    const { state: manageState } = useManageState();
    const { state: geoDataState } = useGeoData();

    let selectedObject = geoDataState.geoData.find(item => item.code === manageState.objectCode) || null;
    if (!selectedObject) {
        return [false];
    }

    let parent_id = selectedObject.parent_id;
    switch (selectedObject.type) {
        case 'starSystem':
            return [!!geoDataState.geoData.find(item => item.parent_id === parent_id || item.star_system_id === parent_id)];
        case 'star':
            return [false];
        case 'planet':
            return [!!geoDataState.geoData.find(item => item.parent_id === parent_id || item.planet_id === parent_id)];
        case 'satellite':
            return [!!geoDataState.geoData.find(item => item.parent_id === parent_id || item.satellite_id === parent_id)];
        case 'geoUnit':
            return [!!geoDataState.geoData.find(item => item.parent_id === parent_id)];
    }

    return [false];
}