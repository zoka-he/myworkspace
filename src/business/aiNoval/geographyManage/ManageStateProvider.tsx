import { IGeoUnionData } from "@/src/types/IAiNoval";
import { createContext, useContext, useReducer } from "react";
import { IGeoTreeItem } from "./geoTree";

interface ManageState {
    treeRaisedObject: IGeoTreeItem<IGeoUnionData> | null;
}

interface ManageStateContextType {
    state: ManageState;
    dispatch: (action: any) => void;
}

interface UseManageStateInterface extends ManageStateContextType {
    setTreeRaisedObject: (obj: IGeoTreeItem<IGeoUnionData> | null) => void;
}

function getDefaultManageState(): ManageState {
    return {
        treeRaisedObject: null,
    };
}

function manageStateReducer(state: ManageState, action: any): ManageState {
    switch (action.type) {
        case 'SET_TREE_RAISED_OBJECT':
            return { ...state, treeRaisedObject: action.payload };
        default:
            return state;
    }
}

const ManageStateContext = createContext<ManageStateContextType>({
    state: getDefaultManageState(),
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
            {children}
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