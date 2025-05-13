import type { Novel, Chapter, Event, EventPool } from './types'

export const mockNovels: Novel[] = [
  {
    id: '1',
    title: '星际迷航',
    chapters: [
      {
        id: '1',
        title: '第一章：启程',
        seedPrompt: '在遥远的未来，人类已经掌握了星际旅行技术...',
        skeletonPrompt: '描述主角第一次踏上星际飞船的场景...',
        events: []
      }
    ]
  }
]

export const mockEventPool: EventPool = {
  selected: [
    {
      id: '1',
      title: '星际飞船启航',
      description: '主角登上星际飞船，开始他的第一次太空之旅',
      worldContext: '未来科技',
      storyLine: '主线',
      location: '地球太空港',
      faction: '星际探索联盟',
      characters: ['李明', '张船长', 'AI助手'],
      category: 'selected'
    },
    {
      id: '2',
      title: '首次跃迁',
      description: '飞船进行第一次空间跃迁，船员们体验了奇妙的时空扭曲',
      worldContext: '未来科技',
      storyLine: '主线',
      location: '跃迁空间',
      faction: '星际探索联盟',
      characters: ['李明', '张船长', '全体船员'],
      category: 'selected'
    }
  ],
  candidate: [
    {
      id: '3',
      title: '神秘信号',
      description: '飞船接收到来自未知星系的信号',
      worldContext: '未来科技',
      storyLine: '支线',
      location: '深空',
      faction: '未知文明',
      characters: ['李明', '通讯官'],
      category: 'candidate'
    },
    {
      id: '4',
      title: '能源危机',
      description: '飞船的能源系统出现故障，需要紧急维修',
      worldContext: '未来科技',
      storyLine: '支线',
      location: '飞船引擎室',
      faction: '星际探索联盟',
      characters: ['李明', '工程师', 'AI助手'],
      category: 'candidate'
    },
    {
      id: '5',
      title: '外星遗迹',
      description: '在探索过程中发现了一个古老的外星文明遗迹',
      worldContext: '未来科技',
      storyLine: '支线',
      location: '未知星球',
      faction: '远古文明',
      characters: ['李明', '考古学家', '安全官'],
      category: 'candidate'
    }
  ]
} 