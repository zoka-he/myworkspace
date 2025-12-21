import { ITimelineDef } from "@/src/types/IAiNoval";
import { createContext, useContext, useEffect, useReducer, useState } from "react";
import fetch from "@/src/fetch";
import { useSimpleWorldviewContext } from "./SimpleWorldviewProvider";

interface TimelineManageState {
    timelineList: ITimelineDef[]
    timelineId: number | null
    timelineData: ITimelineDef | null
}

interface TimelineManageContextRef {
    state: TimelineManageState
    dispatch: (action: any) => void
}

function getDefaultTimelineManageState(): TimelineManageState {
    return {
        timelineList: [],
        timelineId: null,
        timelineData: null
    }
}

const TimelineManageStateContext = createContext<TimelineManageContextRef>({
    state: getDefaultTimelineManageState(),
    dispatch: () => {}
});

function timelineManageReducer(state: TimelineManageState, action: any): TimelineManageState {
    switch (action.type) {
        case 'SET_TIMELINE_ID': {
            let matchedTimelineData = null;
            const timelineId = action.payload;
            if (timelineId && state.timelineList.length > 0) {
                matchedTimelineData = state.timelineList.find((timeline: ITimelineDef) => timeline.id === timelineId) || null;
            }
            return { ...state, timelineId: timelineId, timelineData: matchedTimelineData };
        }

        case 'SET_TIMELINE_LIST': {
            let timelineList = action.payload;
            let matchedTimelineData = null;
            let nextState = {
                ...state,
                timelineList
            }

            if (timelineList.length > 0 && state.timelineId) {
                matchedTimelineData = timelineList.find((timeline: ITimelineDef) => timeline.id === state.timelineId) || null;
            } 

            nextState.timelineData = matchedTimelineData;
            if (!matchedTimelineData) {
                nextState.timelineId = null;
            }
            return nextState;
        }

        default:
            return state
    }
}


async function loadTimelineList(state: TimelineManageState, dispatch: (action: any) => void, worldViewId?: number | null): Promise<ITimelineDef[]> {

    let timelineList = [];

    if (!worldViewId) {
        timelineList = [];
    } else {
        const response = await fetch.get('/api/aiNoval/timeline/list', { params: { worldview_id: worldViewId, page: 1, limit: 1000 } });
        timelineList = response.data || [];
        console.debug('timelineList --> ', timelineList);
    }

    dispatch({
        type: 'SET_TIMELINE_LIST',
        payload: timelineList || []
    });
    return timelineList || [];
}

function setTimelineId(dispatch: (action: any) => void, timelineId?: number | null) {
    dispatch({
        type: 'SET_TIMELINE_ID',
        payload: timelineId
    });
}

export default function TimelineManageStateProvider(props: { children: React.ReactNode }) {
    const { state: worldviewState } = useSimpleWorldviewContext();
    const [state, dispatch] = useReducer(timelineManageReducer, getDefaultTimelineManageState());
    const [initialized, setInitialized] = useState(false);


    useEffect(() => {
        async function init() {
            console.debug('timelineManageProvider init... worldviewId --> ', worldviewState.worldviewId);
            await loadTimelineList(state, dispatch, worldviewState.worldviewId);
            setInitialized(true);
            console.debug('timelineManageProvider init done... ', state);
        }
        init();
    }, []);

    useEffect(() => {
        async function handleWorldviewIdChange() {
            if (worldviewState.worldviewId) {
                await loadTimelineList(state, dispatch, worldviewState.worldviewId);
            } else {
                dispatch({
                    type: 'SET_TIMELINE_LIST',
                    payload: []
                });
            }
        }
        handleWorldviewIdChange();
    }, [worldviewState.worldviewId]);

    if (!initialized) {
        return <div>Loading...</div>;
    } else {
        return (
            <TimelineManageStateContext.Provider value={{ state, dispatch }}>
                {props.children}
            </TimelineManageStateContext.Provider>
        )
    }
    
}

export function useSimpleTimelineProvider() {
    const { state, dispatch } = useContext(TimelineManageStateContext);
    const { state: worldviewState } = useSimpleWorldviewContext();

    useEffect(() => {
        if (worldviewState.worldviewId) {
            loadTimelineList(state, dispatch, worldviewState.worldviewId);
        }
    }, [worldviewState.worldviewId]);
    
    return {
        state,
        dispatch,
        loadTimelineList: (worldViewId?: number | null) => loadTimelineList(state, dispatch, worldViewId),
        setTimelineId: (timelineId?: number | null) => setTimelineId(dispatch, timelineId)
    }
}

