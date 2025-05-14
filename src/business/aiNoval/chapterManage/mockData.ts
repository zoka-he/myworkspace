import type { ITimelineEvent, IChapter } from '@/src/types/IAiNoval'
import type { EventPool, ExtendedNovelData } from './types'

export const mockNovels: ExtendedNovelData[] = [
  {
    id: 1,
    title: '星际迷航',
    chapters: [
      {
        id: 1,
        chapterNumber: 1,
        version: 1,
        title: '启程',
        content: '在遥远的未来，人类已经掌握了星际旅行技术。李明站在太空港的观景台上，望着即将启程的星际飞船，心中充满了期待和紧张。这是他第一次踏上星际探索的旅程，也是人类探索宇宙的重要一步。',
        seedPrompt: '在遥远的未来，人类已经掌握了星际旅行技术...',
        skeletonPrompt: '描述主角第一次踏上星际飞船的场景...',
        events: [],
        worldviewId: 1,
        storylineId: 1,
        eventLineStart1: 0,
        eventLineEnd1: 50,
        eventLineStart2: 30,
        eventLineEnd2: 80
      }
    ]
  }
]

export const mockEventPool: EventPool = {
  selected: [],
  candidate: []
} 