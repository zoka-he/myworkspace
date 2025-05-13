// Event types
export interface Event {
  id: string
  title: string
  description: string
  worldContext: string
  storyLine: string
  location?: string
  faction?: string
  characters?: string[]
  category: 'selected' | 'candidate'
}

// Chapter types
export interface Chapter {
  id: string
  title: string
  seedPrompt: string
  skeletonPrompt: string
  events: Event[]
}

// Novel types
export interface Novel {
  id: string
  title: string
  chapters: Chapter[]
}

// Event pool types
export interface EventPool {
  selected: Event[]
  candidate: Event[]
}

// Export all types
export type { Event, Chapter, Novel, EventPool } 