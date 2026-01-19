import { createContext, useContext, useEffect, useReducer, useState } from "react";

declare type TimelineManageMode = 'compare' | 'edit' | 'create';

interface TimelineManageState {
    mode: TimelineManageMode
    compare_ids: number[]
    selectedTimelineId: number | null
    dateCalculatorOpen: boolean
}

interface TimelineManageContextRef {
    state: TimelineManageState
    dispatch: (action: any) => void
    setMode: (mode: TimelineManageMode) => void
    setCompareIds: (ids: number[]) => void
    setSelectedTimelineId: (id: number | null) => void
    openDateCalculator: () => void
    closeDateCalculator: () => void
}

function getDefaultTimelineManageState(): TimelineManageState {
    return {
        mode: 'compare',
        compare_ids: [],
        selectedTimelineId: null,
        dateCalculatorOpen: false // for test
    }
}

const TimelineManageContext = createContext<TimelineManageContextRef>({
    state: getDefaultTimelineManageState(),
    dispatch: () => {},
    setMode: () => {},
    setCompareIds: () => {},
    setSelectedTimelineId: () => {},
    openDateCalculator: () => {},
    closeDateCalculator: () => {}
});

function timelineManageReducer(state: TimelineManageState, action: any): TimelineManageState {
    switch (action.type) {
        case 'SET_MODE': {
            if (action.payload === 'create') {
                return { ...state, mode: action.payload, selectedTimelineId: null };
            } else {
                return { ...state, mode: action.payload };
            } 
        }
        case 'SET_COMPARE_IDS': {
            return { ...state, compare_ids: action.payload };
        }
        case 'SET_SELECTED_TIMELINE_ID': {
            return { ...state, selectedTimelineId: action.payload };
        }
        case 'SET_DATE_CALCULATOR_OPEN': {
            return { ...state, dateCalculatorOpen: action.payload };
        }
        default:
            return state;
    }
}

export default function TimelineManageProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(timelineManageReducer, getDefaultTimelineManageState());

    const contextValue: TimelineManageContextRef = {
        state,
        dispatch: (action: any) => dispatch(action),
        setMode: (mode: TimelineManageMode) => {
            dispatch({
                type: 'SET_MODE',
                payload: mode
            })
        },
        setCompareIds: (ids: number[]) => {
            dispatch({
                type: 'SET_COMPARE_IDS',
                payload: ids
            })
        },
        setSelectedTimelineId: (id: number | null) => {
            dispatch({
                type: 'SET_SELECTED_TIMELINE_ID',
                payload: id
            })
        },
        openDateCalculator: () => {
            dispatch({
                type: 'SET_DATE_CALCULATOR_OPEN',
                payload: true
            })
        },
        closeDateCalculator: () => {
            dispatch({
                type: 'SET_DATE_CALCULATOR_OPEN',
                payload: false
            })
        }
    }

    return (
        <TimelineManageContext.Provider value={contextValue}>
            {children}
        </TimelineManageContext.Provider>
    )
}

export function useTimelineManageContext() {
    return useContext(TimelineManageContext);
}