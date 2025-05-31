import { Alert, Button, Card, message, Modal, Space, Tag, Typography } from 'antd'
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import ChapterStripState, { type ChapterStripReport, type ChapterStripStateProps } from './ChapterStripState'
import * as apiCalls from '../apiCalls';

interface GenSkeletonModalProps {
  worldviewId: number
  seedPrompt: string
  relativeChapters: number[]
  characters: string
  factions: string
  locations: string
  skeletonPrompt: string
}

interface ModalContextType {
  showModal: (props: GenSkeletonModalProps) => void
  hideModal: () => void
  modalProps: GenSkeletonModalProps | null
}

interface ContentViewModalProps {
    isVisible: boolean
    onClose: () => void
    content: string
    chapterInfo: {
      chapterNumber: number
      chapterTitle: string
      version: number
    } | null
    type: 'original' | 'stripped'
  }

const ModalContext = createContext<ModalContextType | null>(null)

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modalProps, setModalProps] = useState<GenSkeletonModalProps | null>(null)

  const showModal = useCallback((props: GenSkeletonModalProps) => {
    setModalProps(props)
  }, [])

  const hideModal = useCallback(() => {
    setModalProps(null)
  }, [])

  const contextValue = {
    showModal,
    hideModal,
    modalProps
  }

  useEffect(() => {
    setModalRef(contextValue)
    return () => setModalRef(null)
  }, [contextValue])

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      {modalProps && <GenSkeletonModalContent {...modalProps} onClose={hideModal} />}
    </ModalContext.Provider>
  )
}

// 展示章节内容
function ContentViewModal({ isVisible, onClose, content, chapterInfo, type }: ContentViewModalProps) {
    const modalTitle = chapterInfo 
      ? `${chapterInfo.chapterNumber} ${chapterInfo.chapterTitle} (v${chapterInfo.version}) - ${type === 'original' ? '原文' : '缩写'}`
      : ''
  
    return (
      <Modal
        title={modalTitle}
        open={isVisible}
        onCancel={onClose}
        width={'60vw'}
        footer={[
          <Button key="close" onClick={onClose}>
            关闭
          </Button>
        ]}
      >
        <div style={{ 
          maxHeight: '60vh', 
          overflow: 'auto',
          padding: '16px',
          backgroundColor: '#fafafa',
          borderRadius: '4px'
        }}>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
            {content}
          </Typography.Paragraph>
        </div>
      </Modal>
    )
  }

function GenSkeletonModalContent(props: GenSkeletonModalProps & { onClose: () => void }) {

    const [backgroundSummary, setBackgroundSummary] = useState<string>('')

    const [stripReportList, setStripReportList] = useState<ChapterStripReport[]>([])

    const [isStrippedModalVisible, setIsStrippedModalVisible] = useState(false)
    const [viewingContent, setViewingContent] = useState('')
    const [viewingChapterInfo, setViewingChapterInfo] = useState<ChapterStripReport | null>(null)
    const [viewingType, setViewingType] = useState<'original' | 'stripped'>('stripped')

    const [skeletonPrompt, setSkeletonPrompt] = useState('')

    const [isWorking, setIsWorking] = useState(false)

    const [canGenerateSkeletonPrompt, setCanGenerateSkeletonPrompt] = useState(false)

    useEffect(() => {
        setStripReportList([])
    }, [props.relativeChapters])

    useEffect(() => {
        if (props.skeletonPrompt.replace('\n', '').trim() === '') {
            setSkeletonPrompt('')
            return;
        }

        setSkeletonPrompt(props.skeletonPrompt)
    }, [props.skeletonPrompt])

    useEffect(() => {
        let satisfied = true;

        if (props.seedPrompt.length === 0) {
            satisfied = false;
        }

        if (props.relativeChapters.length > 0 && stripReportList.length === 0) {
            satisfied = false;
        }

        if (stripReportList.length > 0) {
            for (const chapter of stripReportList) {
                if (chapter.state !== 'completed') {
                    satisfied = false;
                    break;
                }
            }
        }

        setCanGenerateSkeletonPrompt(satisfied)
    }, [props.seedPrompt, props.relativeChapters, stripReportList])

    async function prepareStripBackground() {
        const preparedChapterList: ChapterStripReport[] = [];

        for (const chapterId of props.relativeChapters) {
            const res = await apiCalls.getChapterById(Number(chapterId));
            preparedChapterList.push({
                state: 'pending',
                chapterNumber: res.chapter_number || 0,
                chapterTitle: res.title || '',
                version: res.version || 0,
                id: res.id,
                originalContent: res.content || '',
                strippedContent: ''
            });
        }

        setStripReportList(preparedChapterList)

        return preparedChapterList;
    }

    async function beginStripBackground() {
        try {
            setIsWorking(true)

            let preparedChapterList = await prepareStripBackground();

            for (const index in preparedChapterList) {
                const chapter = preparedChapterList[index];

                if (chapter.state === 'pending') {
                    if ((chapter?.originalContent?.length || 0) === 0) {
                        preparedChapterList[index].state = 'completed';
                        setStripReportList([...preparedChapterList]);
                        continue;
                    }

                    preparedChapterList[index].state = 'processing';
                    setStripReportList([...preparedChapterList]);
        
                    const text = await apiCalls.stripChapterBlocking(chapter.id || 0)

                    preparedChapterList[index].state = 'completed';
                    preparedChapterList[index].strippedContent = text;
                    setStripReportList([...preparedChapterList]);
                }
            }

            setStripReportList(preparedChapterList);

        } catch (error) {
            setIsWorking(false)
            message.error('背景概括生成失败')
            console.error(error)
        } finally {
            setIsWorking(false)
        }
            
    }

    function renderBeginStripBackground() {
        return (
            <Alert 
                message={`当前有${props.relativeChapters?.length || 0}个背景章节需要处理`} 
                type="info"
                showIcon
                description={<Button type="primary" onClick={beginStripBackground}>准备背景概括</Button>}
            />
        )
    }

    function renderStripReportList() {
        let content = [];

        for (const chapter of stripReportList) {
            content.push(
                <ChapterStripState
                    key={chapter.id}
                    {...chapter}
                    onViewStripped={() => handleViewStripped(chapter.strippedContent || '', chapter)}
                    onViewOriginal={() => handleViewOriginal(chapter.originalContent || '', chapter)}
                />
            )
        }
        return content;
    }

    function handleViewStripped(content: string, chapterInfo: ChapterStripReport) {
        setViewingContent(content)
        setViewingChapterInfo(chapterInfo)
        setViewingType('stripped')
        setIsStrippedModalVisible(true)
    }

    function handleViewOriginal(content: string, chapterInfo: ChapterStripReport) {
        setViewingContent(content)
        setViewingChapterInfo(chapterInfo)
        setViewingType('original')
        setIsStrippedModalVisible(true)
    }

    function handleViewSkeletonPrompt() {
        return (
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{skeletonPrompt}</Typography.Paragraph>
        )
    }

    function handleHintWriteSkeletonPrompt() {
        if (canGenerateSkeletonPrompt) {
            return (
                <Alert
                    message={`当前条件已满足，请点击按钮生成章节骨架提示词`} 
                type="info"
                showIcon
                description={<Button type="primary" onClick={beginGenSkeletonPrompt}>生成章节骨架提示词</Button>}
            />);
        } else {
            return (
                <Alert
                    message={`当前条件未满足，请先完成背景概括`} 
                    type="warning"
                    showIcon
                />
            )
        }
    }

    
    async function beginGenSkeletonPrompt() {
        try {
            setIsWorking(true)
            setSkeletonPrompt('生成中...')

            const params = {
                root_prompt: props.seedPrompt,
                characters: props.characters,
                factions: props.factions,
                locations: props.locations,
                background: stripReportList.map(chapter => chapter.strippedContent).join('\n'),
            }
            
            let response_text = await apiCalls.genSkeletonPrompt(props.worldviewId, params)

            setSkeletonPrompt(response_text)
        } catch (error) {
            message.error('章节骨架提示词生成失败')
            console.error(error)
        } finally {
            setIsWorking(false)
        }
    }

    function handleCopySkeletonPrompt() {
        navigator.clipboard.writeText(skeletonPrompt)
        message.success('章节骨架提示词已复制到剪贴板')
    }

    return (
        <Modal
            title="Generate Skeleton"
            open={true}
            onCancel={props.onClose}
            footer={null}
            width={'80vw'}
        >
            <Space direction="vertical" size={16}>
                <Card title="根提示词" size="small">
                <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{props.seedPrompt}</Typography.Paragraph>
                </Card>

                <Card title="角色" size="small">
                {props.characters.split(',').map((character: string, index: number) => (
                    <Tag key={index}>{character}</Tag>
                ))}
                </Card>

                <Card title="势力" size="small">
                {props.factions.split(',').map((faction: string, index: number) => (
                    <Tag key={index}>{faction}</Tag>
                ))}
                </Card>
                

                <Card title="地点" size="small">
                {props.locations.split(',').map((location: string, index: number) => (
                    <Tag key={index}>{location}</Tag>
                ))}
                </Card>

                <Card title={
                    <div className="f-flex-two-side">
                        <span className="font-medium">背景概括</span>
                        {
                            stripReportList?.length > 0 && (
                                <Button type="primary" danger size="small" onClick={() => setBackgroundSummary('')} disabled={isWorking}>重写</Button>
                            )
                        }
                    </div>    
                } size="small">
                    { stripReportList?.length > 0 ? renderStripReportList() : renderBeginStripBackground() }
                </Card>

                <Card title={<div className="f-flex-two-side">
                        <Space>
                            <span className="font-medium">章节骨架提示词</span>
                            <Button type="link" onClick={handleCopySkeletonPrompt}>复制</Button>
                        </Space>
                        
                        {[
                            skeletonPrompt && canGenerateSkeletonPrompt && (
                                <Button type="primary" danger size="small" onClick={() => beginGenSkeletonPrompt()} disabled={isWorking}>重写</Button>
                            ),
                            skeletonPrompt && !canGenerateSkeletonPrompt && (
                                <span color="gray">重写条件未满足，请检查（特别是背景概括）</span>
                            )
                        ]}
                    </div>} size="small">
                    {
                        skeletonPrompt ? handleViewSkeletonPrompt() : handleHintWriteSkeletonPrompt()
                    }
                </Card>
            </Space>

            <ContentViewModal
                isVisible={isStrippedModalVisible}
                onClose={() => setIsStrippedModalVisible(false)}
                content={viewingContent}
                chapterInfo={viewingChapterInfo}
                type={viewingType}
            />
        </Modal>
    )
}

export function useGenSkeletonModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useGenSkeletonModal must be used within a ModalProvider')
  }
  return context
}

// 创建一个全局变量来存储 modal 的引用
let modalRef: ModalContextType | null = null

// 在 Provider 中设置引用
export function setModalRef(ref: ModalContextType | null) {
  modalRef = ref
}

// 导出一个普通函数来显示 modal
export function showGenSkeletonModal(props: GenSkeletonModalProps) {
  if (!modalRef) {
    console.error('Modal provider not initialized')
    return
  }
  modalRef.showModal(props)
}

export default ModalProvider