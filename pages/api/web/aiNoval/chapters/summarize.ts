import { NextApiRequest, NextApiResponse } from 'next'
import _ from 'lodash'
import ChaptersService from '@/src/services/aiNoval/chaptersService'
import { stripParagraphInternal } from '../llm/once/stripParagraph'

interface Data {
  message?: string
  summary?: string
}

const chaptersService = new ChaptersService()

async function handleSummarize(req: NextApiRequest, res: NextApiResponse<Data>) {
  const chapterId = _.toNumber(req.query.chapterId ?? (req.body as any)?.chapterId)
  if (!chapterId || !Number.isFinite(chapterId)) {
    res.status(400).json({ message: 'chapterId is required and must be a number' })
    return
  }

  const targetLength = _.toNumber(req.query.targetLength ?? (req.query as any).stripLength ?? 300)
  if (!Number.isFinite(targetLength) || targetLength <= 0) {
    res.status(400).json({ message: 'targetLength is invalid' })
    return
  }

  const chapter: any = await chaptersService.queryOne({ id: chapterId })
  if (!chapter) {
    res.status(404).json({ message: 'chapter not found' })
    return
  }

  const srcText: string = chapter.content || ''
  if (!srcText?.length) {
    res.status(400).json({ message: 'chapter content is empty' })
    return
  }

  try {
    const summary = await stripParagraphInternal(srcText, targetLength)

    if (!summary) {
      res.status(500).json({ message: 'summarize result is empty' })
      return
    }

    await chaptersService.updateOne({ id: chapterId }, { summary })

    res.status(200).json({ summary })
  } catch (error) {
    console.error('summarize chapter error:', error)
    res.status(500).json({ message: 'Request failed: ' + (error as Error).message })
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed, only POST is allowed' })
    return
  }

  handleSummarize(req, res)
}

