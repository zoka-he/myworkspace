import { createContext, useContext, useEffect, useMemo, useReducer } from "react"
import { IChapter } from "./types"
import * as apiCalls from './apiCalls'

interface ChapterContextProviderProps {
    novelId: number | null
    chapterId: number | null
    userUpdateTime: number
    children: React.ReactNode
}

interface ChapterContextType {
    state: IChapter | null
    dispatch: (action: any) => void
}

export const ChapterContext = createContext<ChapterContextType>({
    state: null,
    dispatch: () => {}
})

function initialState(): IChapter | null {
    return null
}

function chapterReducer(state: IChapter | null, action: any) {
    switch (action.type) {
        case 'SET_SELECTED_CHAPTER':
            if (!action.payload) {
                return null
            } else {
                return action.payload
            }
        default:
            return state
    }
}

export default function ChapterContextProvider({ novelId, chapterId, userUpdateTime, children }: ChapterContextProviderProps) {
    const [ state, dispatch ] = useReducer(chapterReducer, initialState())

    useMemo(() => {
        (async () => {  
            console.debug('更新章节数据');
            if (!chapterId) {
                dispatch({
                    type: 'SET_SELECTED_CHAPTER',
                    payload: null
                })
                return
            } else {
                const chapter = await apiCalls.getChapterById(chapterId)
                dispatch({
                    type: 'SET_SELECTED_CHAPTER',
                    payload: chapter
                })
            }
        })()
        
    }, [novelId, chapterId, userUpdateTime])

    // 修复 Provider 传递的 value 类型，确保类型与 ChapterContextType 匹配
    return (
        <ChapterContext.Provider value={{ state, dispatch }}>
            {children}
        </ChapterContext.Provider>
    )
}

async function forceUpdateChapter(chapterId: number, dispatch: (action: any) => void) {
    if (!chapterId) {
        return
    }
    const chapter = await apiCalls.getChapterById(chapterId)
    dispatch({
        type: 'SET_SELECTED_CHAPTER',
        payload: chapter
    })
}

export function useChapterContext() {
    const context = useContext(ChapterContext)
    if (!context) {
        throw new Error('useChapterContext must be used within a ChapterContextProvider')
    }
    return {
        ...context,
        forceUpdateChapter: (chapterId: number) => forceUpdateChapter(chapterId, context.dispatch)
    }
}
