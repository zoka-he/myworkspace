import { createContext } from "react";
import { IRolePositionRecord, ITimelineEvent } from "@/src/types/IAiNoval";

interface GraphDataContextType {
    timelineEvents: ITimelineEvent[];
    rolePositions: IRolePositionRecord[];
}

const context = createContext<GraphDataContextType>({
    timelineEvents: [],
    rolePositions: [],
});

export default context;