import { createContext, useContext, useReducer } from "react";

interface BussSwitchState {
    currentBuss: string;
}

interface BussSwitchContextType {
    state: typeof defaultValues;
    dispatch: (action: any) => void;
}

const defaultValues: BussSwitchState = {
    currentBuss: 'chapterDuration',
}

const BussSwitchContext = createContext<BussSwitchContextType>({
    state: Object.assign({}, defaultValues),
    dispatch: () => {}
});


function bussSwitchReducer(state: typeof defaultValues, action: any) {
    switch (action.type) {
        case 'SET_CURRENT_BUSS':
            return { ...state, currentBuss: action.payload };
        default:
            return state;
    }
}


export default function SwitchProvider({ children }: { children: React.ReactNode }) {

    const [state, dispatch] = useReducer(bussSwitchReducer, Object.assign({}, defaultValues));

    return (
        <BussSwitchContext.Provider value={{ state, dispatch }}>
            {children}
        </BussSwitchContext.Provider>
    )
}

export function useBussSwitchContext() {
    const context =  useContext(BussSwitchContext);

    return {
        ...context,
        setCurrentBuss: (buss: string) => {
            context.dispatch({ type: 'SET_CURRENT_BUSS', payload: buss });
        }
    }
}