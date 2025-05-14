import type { INovalData, ITimelineEvent, IChapter } from '@/src/types/IAiNoval'

// Extended novel type with chapters
export interface ExtendedNovelData extends INovalData {
  chapters: IChapter[]
}

// Event pool types
export interface EventPool {
  selected: ITimelineEvent[]
  candidate: ITimelineEvent[]
}

// Export all types
export type { INovalData, ITimelineEvent, IChapter, EventPool, ExtendedNovelData } 