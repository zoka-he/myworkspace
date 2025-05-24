import React, { useEffect, useState } from 'react'
import { Modal, Button, Space, message, Row, Col, Form, Select, Checkbox, Divider, Input, Tag } from 'antd'
import { CopyOutlined, EditOutlined, RedoOutlined, RobotOutlined } from '@ant-design/icons'
import { IChapter } from '@/src/types/IAiNoval'
import * as chapterApi from '../apiCalls'
import styles from './ChapterContinuePanel.module.scss'
import * as apiCalls from '../apiCalls'
import TextArea from 'antd/es/input/TextArea'

interface ChapterContinueModalProps {
  selectedChapterId: number | undefined
  isVisible: boolean
  onClose: () => void
  onChapterChange: () => void
}

function ChapterContinueModal({ selectedChapterId, isVisible, onClose, onChapterChange }: ChapterContinueModalProps) {
  const [continuedContent, setContinuedContent] = useState('')
  const [isContinuing, setIsContinuing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [form] = Form.useForm()

  const [selectedChapter, setSelectedChapter] = useState<any | null>(null)
  const [novelId, setNovelId] = useState<number | undefined>(undefined)
  const [chapterList, setChapterList] = useState<IChapter[]>([])
  const [relatedChapterIds, setRelatedChapterIds] = useState<number[]>([])
  const [seedPrompt, setSeedPrompt] = useState<string>('')
  const [roleNames, setRoleNames] = useState<string>('')
  const [factionNames, setFactionNames] = useState<string>('')
  const [geoNames, setGeoNames] = useState<string>('')

  // 初始化
  useEffect(() => {
    reloadChapter();
  }, [])

  useEffect(() => {
    reloadChapter();
  }, [selectedChapterId])

  const reloadChapter = async () => {
    if (selectedChapterId) {
      const res = await apiCalls.getContinueInfo(selectedChapterId)
      console.info('reloadChapter ----------------> ', res);
      setSelectedChapter(res || null)
    }
  }

  // 填充章节数据
  useEffect(() => {
    if (selectedChapter) {
      setNovelId(selectedChapter.novel_id)
      setRelatedChapterIds(selectedChapter?.related_chapter_ids?.split(',').map(s => s.trim()).filter(s => s.length > 0).map(_.toNumber) || [])
      setSeedPrompt(selectedChapter.skeleton_prompt || selectedChapter.seed_prompt || '')
      setRoleNames(selectedChapter?.actual_roles || selectedChapter?.role_names || '')
      setFactionNames(selectedChapter?.actual_factions || selectedChapter?.faction_names || '')
      setGeoNames(selectedChapter?.actual_locations || selectedChapter?.geo_names || '')
    }
  }, [selectedChapter])

  

  // 获取章节列表
  useEffect(() => {
    if (novelId) {
      apiCalls.getChapterList(novelId).then(res => {
        const ret = res.data;
        if (ret && ret.length > 0) {
          setChapterList(ret.reverse())
        } else {
          setChapterList([])
        }
      })
    }
  }, [novelId])

  // 处理AI续写
  const handleContinue = async () => {
    if (!selectedChapter) return

    try {
      setIsContinuing(true)
      setContinuedContent('')

      const text = await chapterApi.continueChapterBlocking(selectedChapter.id || 0)

      setContinuedContent(text)

    } catch (error) {
      console.error('continueChapter error -> ', error)
      message.error('续写失败')
    } finally {
      setIsContinuing(false)
    }
  }

  const handleStoreActualPrompt = async () => {
    if (!selectedChapterId) {
      message.error('章节id为空，请检查程序或数据状态')
      return;
    }

    try {
      setIsLoading(true)
      await chapterApi.updateChapter({
        id: selectedChapterId,
        actual_roles: roleNames,
        actual_factions: factionNames,
        actual_locations: geoNames,
        skeleton_prompt: seedPrompt
      })  
      message.success('存储成功')
    } catch (error) {
      console.error('storeActualPrompt error -> ', error)
      message.error('存储失败')
    } finally {
      reloadChapter();
      setIsLoading(false)
    }
  }

  // 重置提示词
  const handleResetPrompt = (field: string) => {
    switch (field) {
      case 'role_names':
        setRoleNames(selectedChapter?.role_names || '')
        break;
        
      case 'faction_names':
        setFactionNames(selectedChapter?.faction_names || '')
        break;

      case 'geo_names':
        setGeoNames(selectedChapter?.geo_names || '')
        break;

      case 'seed_prompt':
        setSeedPrompt(selectedChapter?.seed_prompt || '')
        break;

      case 'actual_roles':
        setRoleNames(selectedChapter?.actual_roles || '')
        break;

      case 'actual_factions':
        setFactionNames(selectedChapter?.actual_factions || '')
        break;

      case 'actual_locations':
        setGeoNames(selectedChapter?.actual_locations || '')
        break;

      case 'skeleton_prompt':
        setSeedPrompt(selectedChapter?.skeleton_prompt || '')
        break;
    }
  }

  // 优化提示词
  const handleOptimizePrompt = async (target: string) => {

    let startTime = new Date().getTime();

    let prompt = '';

    switch (target) {
      case 'roles':
        prompt = roleNames;
        break;

      case 'factions':
        prompt = factionNames;
        break;

      case 'locations':
        prompt = geoNames;
        break;

      default:
        message.error('无效的提取目标：' + target + '，请检查程序状态')
        return;
    }

    try {
      setIsLoading(true)
      message.info('优化中...')

      // 从提示词中提取目标数据
      let src_text = seedPrompt;

      let res = await chapterApi.pickFromText(target, src_text)
      console.debug('handleOptimizePrompt -> ', res);

      let itemSet = new Set<string>();

      if (prompt && prompt.length > 0) {
        prompt.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0).forEach((s: string) => itemSet.add(s));
      }

      if (res && res.length > 0) {
        res.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0).forEach((s: string) => itemSet.add(s));
      }

      
      switch (target) {
        case 'roles':
          setRoleNames(Array.from(itemSet).join(','));
          break;

        case 'factions':
          setFactionNames(Array.from(itemSet).join(','));
          break;

        case 'locations':
          setGeoNames(Array.from(itemSet).join(','));
          break;
      }

      let endTime = new Date().getTime(); 
      let costTime = (endTime - startTime) / 1000;

      message.success('优化成功，耗时：' + costTime.toFixed(2) + '秒')
    } catch (error) {
      console.error('handleOptimizePrompt error -> ', error)
      message.error('优化失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 复制续写内容
  const handleCopyContinued = () => {
    navigator.clipboard.writeText(continuedContent)
      .then(() => message.success('续写内容已复制到剪贴板'))
      .catch(() => message.error('复制失败'))
  }

  // 应用续写内容
  const handleApplyContinued = async () => {
    if (!selectedChapter || !continuedContent) return

    try {
      setIsLoading(true)
      await chapterApi.updateChapter({
        id: selectedChapter.id,
        content: selectedChapter.content + '\n\n' + continuedContent
      })
      message.success('续写内容已添加')
      onClose()
      onChapterChange()
    } catch (error) {
      message.error('添加续写内容失败')
    } finally {
      setIsLoading(false)
    }
  }

  const modalTitle = selectedChapter ? `AI续写 - 当前第 ${selectedChapter.chapter_number} 章: ${selectedChapter.title}，版本：v${selectedChapter.version}` : 'AI续写'

  return (
    <Modal
      title={modalTitle}
      open={isVisible}
      onCancel={onClose}
      width={'80vw'}
      footer={
        <div className={styles.footer}>
          <Row gutter={16}>
            <Col span={12}>
              <Button onClick={handleStoreActualPrompt}>存储提示词集</Button>
            </Col>
            <Col span={12}>
              <Button key="copy" icon={<CopyOutlined />} onClick={handleCopyContinued}>
                复制续写内容
              </Button>

              <Button 
                key="apply" 
                type="primary" 
                onClick={handleApplyContinued}
                loading={isLoading}
                disabled={!continuedContent}
              >
                应用续写
              </Button>,
              <Button key="close" onClick={onClose}>
                关闭
              </Button>
            </Col>
          </Row>
        </div>}
    >
      <div className={styles.continueContent}>
        <Row gutter={16}>
          <Col span={12}>

              <Divider orientation="left">前序章节</Divider>

              <Select
                mode="multiple"
                placeholder="请选择前序章节"
                style={{ width: '100%' }}
                allowClear
                value={relatedChapterIds}
                onChange={(value) => setRelatedChapterIds(value)}
              >
                {chapterList.map(chapter => (
                  <Select.Option key={chapter.id} value={chapter.id}>
                    {chapter.chapter_number} {chapter.title} : v{chapter.version}
                  </Select.Option>
                ))}
              </Select>

              <Divider orientation="left">提示词</Divider>

              <div className={styles.prompt_title}>
                <div>
                  <span>角色提示词：</span>
                  { roleNames === selectedChapter?.role_names ? <Tag color="blue">初始值</Tag> : null }
                  { roleNames === selectedChapter?.actual_roles ?  <Tag color="green">存储值</Tag> : null }
                  { (roleNames !== selectedChapter?.role_names && roleNames !== selectedChapter?.actual_roles) ?  <Tag color="red">已修改</Tag> : null }
                </div>
                <div>
                  <Button size="small" disabled={isLoading} onClick={() => handleOptimizePrompt('roles')}>AI优化</Button>
                  <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('role_names')}>复原初始值</Button>
                  <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('actual_roles')}>复原存储值</Button>
                </div>
              </div>
              <div>
                <TextArea autoSize={{ minRows: 1 }} disabled={isLoading} value={roleNames} onChange={(e) => setRoleNames(e.target.value)} />
              </div>

              <div className={styles.prompt_title}>
                <div>
                  <span>阵营提示词：</span>
                  { factionNames === selectedChapter?.faction_names ? <Tag color="blue">初始值</Tag> : null }
                  { factionNames === selectedChapter?.actual_factions ?  <Tag color="green">存储值</Tag> : null }
                  { (factionNames !== selectedChapter?.faction_names && factionNames !== selectedChapter?.actual_factions) ?  <Tag color="red">已修改</Tag> : null }
                </div>
                <div>
                  <Button size="small" disabled={isLoading} onClick={() => handleOptimizePrompt('factions')}>AI优化</Button>
                  <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('faction_names')}>复原初始值</Button>
                  <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('actual_factions')}>复原存储值</Button>
                </div>
              </div>
              <div>
                <TextArea autoSize={{ minRows: 1 }} disabled={isLoading} value={factionNames} onChange={(e) => setFactionNames(e.target.value)} />
              </div>

              <div className={styles.prompt_title}>
                <div>
                  <span>地理提示词：</span>
                  { geoNames === selectedChapter?.geo_names ? <Tag color="blue">初始值</Tag> : null }
                  { geoNames === selectedChapter?.actual_locations ?  <Tag color="green">存储值</Tag> : null }
                  { (geoNames !== selectedChapter?.geo_names && geoNames !== selectedChapter?.actual_locations) ?  <Tag color="red">已修改</Tag> : null }
                </div>
                <div>
                  <Button size="small" disabled={isLoading} onClick={() => handleOptimizePrompt('locations')}>AI优化</Button>
                  <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('geo_names')}>复原初始值</Button>
                  <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('actual_locations')}>复原存储值</Button>
                </div>
              </div>
              <div>
                <TextArea autoSize={{ minRows: 1 }} disabled={isLoading} value={geoNames} onChange={(e) => setGeoNames(e.target.value)} />
              </div>

              <div className={styles.prompt_title}>
                <div>
                  <span>章节提示词：</span>
                  { seedPrompt === selectedChapter?.seed_prompt ? <Tag color="blue">初始值</Tag> : null }
                  { seedPrompt === selectedChapter?.skeleton_prompt ?  <Tag color="green">存储值</Tag> : null }
                  { (seedPrompt !== selectedChapter?.seed_prompt && seedPrompt !== selectedChapter?.skeleton_prompt) ?  <Tag color="red">已修改</Tag> : null }
                </div>
                <div>
                  <Button size="small" disabled={isLoading} onClick={() => handleOptimizePrompt('seed_prompt')}>AI优化</Button>
                  <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('seed_prompt')}>复原初始值</Button>
                  <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('skeleton_prompt')}>复原存储值</Button>
                </div>
              </div>
              <div>
                <TextArea
                  disabled={isLoading}
                  autoSize={{ minRows: 19 }}
                  value={seedPrompt}
                  onChange={(e) => setSeedPrompt(e.target.value)}
                />
              </div>
          </Col>

          <Col span={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                icon={<RobotOutlined />}
                onClick={handleContinue}
                loading={isContinuing}
                disabled={!selectedChapter?.content}
              >
                使用AI续写
              </Button>
              <div className={styles.continuedText}>
                {isContinuing ? '续写中...' : (continuedContent || '点击上方按钮开始续写...')}
              </div>
            </Space>
          </Col>
        </Row>
      </div>
    </Modal>
  )
}

export default ChapterContinueModal 