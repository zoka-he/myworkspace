import { createContext } from "react";
import { ITimelineEvent } from "@/src/types/IAiNoval";

interface GraphDataContextType {
    timelineEvents: ITimelineEvent[];
}

const context = createContext<GraphDataContextType>({
    timelineEvents: [],
});

export default context;