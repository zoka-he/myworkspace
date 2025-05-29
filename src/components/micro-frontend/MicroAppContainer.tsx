'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { registerMicroApps, start, initGlobalState, loadMicroApp } from 'qiankun'
import styles from './MicroAppContainer.module.css'

interface MicroAppContainerProps {
  name: string
  entry: string
  activeRule: string
  onBeforeLoad?: () => Promise<void>
  onBeforeMount?: () => Promise<void>
  onAfterMount?: () => Promise<void>
  onBeforeUnmount?: () => Promise<void>
  onAfterUnmount?: () => Promise<void>
}

function MicroAppContainer({
  name,
  entry,
  activeRule,
  onBeforeLoad,
  onBeforeMount,
  onAfterMount,
  onBeforeUnmount,
  onAfterUnmount
}: MicroAppContainerProps) {
  const [containerId] = useState(() => `micro-app-${name}-${Math.random().toString(36).substring(2, 9)}`)
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<any>(null)

  const handleBeforeLoad = useCallback(async () => {
    setIsLoading(true)
    setHasError(false)
    setErrorMessage('')
    console.log(`[LifeCycle] before load ${name}`)
    try {
      if (onBeforeLoad) await onBeforeLoad()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load micro-app')
      setIsLoading(false)
      throw error
    }
  }, [name, onBeforeLoad])

  const handleBeforeMount = useCallback(async () => {
    console.log(`[LifeCycle] before mount ${name}`)
    try {
      if (onBeforeMount) await onBeforeMount()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to mount micro-app')
      setIsLoading(false)
      throw error
    }
  }, [name, onBeforeMount])

  const handleAfterMount = useCallback(async () => {
    setIsLoading(false)
    setIsMounted(true)
    setHasError(false)
    setErrorMessage('')
    console.log(`[LifeCycle] after mount ${name}`)
    try {
      if (onAfterMount) await onAfterMount()
    } catch (error) {
      setHasError(true)
      setErrorMessage(error instanceof Error ? error.message : 'Failed after mount')
      throw error
    }
  }, [name, onAfterMount])

  const handleBeforeUnmount = useCallback(async () => {
    console.log(`[LifeCycle] before unmount ${name}`)
    try {
      if (onBeforeUnmount) await onBeforeUnmount()
    } catch (error) {
      console.error('Error during unmount:', error)
    }
  }, [name, onBeforeUnmount])

  const handleAfterUnmount = useCallback(async () => {
    setIsMounted(false)
    console.log(`[LifeCycle] after unmount ${name}`)
    try {
      if (onAfterUnmount) await onAfterUnmount()
    } catch (error) {
      console.error('Error after unmount:', error)
    }
  }, [name, onAfterUnmount])

  const loadApp = useCallback(async () => {
    try {
      setIsLoading(true)
      setHasError(false)
      setErrorMessage('')

      // 验证入口文件是否可访问
      try {
        const response = await fetch(entry)
        if (!response.ok) {
          throw new Error(`Failed to fetch entry file: ${response.status} ${response.statusText}`)
        }
      } catch (error) {
        throw new Error(`Entry file is not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // 确保容器元素存在
      if (!containerRef.current) {
        throw new Error('Container element not found')
      }

      // 如果已经存在应用实例，先卸载
      if (appRef.current) {
        await appRef.current.unmount()
        appRef.current = null
      }

      // 加载微应用
      appRef.current = loadMicroApp({
        name,
        entry,
        container: containerRef.current,
        props: {
          getGlobalState: () => window.__POWERED_BY_QIANKUN__ ? window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ : '',
        }
      })

      setIsLoading(false)
      setIsMounted(true)
    } catch (error) {
      console.error(`Failed to load micro-app ${name}:`, error)
      setHasError(true)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load micro-app')
      setIsLoading(false)
    }
  }, [name, entry])

  const handleReload = useCallback(() => {
    loadApp()
  }, [loadApp])

  useEffect(() => {
    let isComponentMounted = true

    const initMicroApp = async () => {
      try {
        // 初始化全局状态
        const actions = initGlobalState({
          user: 'qiankun'
        })

        actions.onGlobalStateChange((state, prev) => {
          console.log('[GlobalState]', state, prev)
        })

        // 启动 qiankun
        await start({
          sandbox: {
            strictStyleIsolation: true,
            experimentalStyleIsolation: true
          },
          singular: false,
          prefetch: false,
          excludeAssetFilter: (assetUrl: string) => {
            return assetUrl.includes('single-spa');
          }
        })

        // 加载微应用
        await loadApp()

        return () => {
          actions.offGlobalStateChange()
        }
      } catch (error) {
        if (isComponentMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to initialize micro-app')
          setIsLoading(false)
        }
      }
    }

    initMicroApp()

    return () => {
      isComponentMounted = false
      // 清理微应用
      if (appRef.current) {
        appRef.current.unmount()
        appRef.current = null
      }
    }
  }, [loadApp])

  return (
    <div className={styles['micro-app-container']}>
      {isLoading && (
        <div className={styles['loading']}>
          Loading {name}...
        </div>
      )}
      {hasError && (
        <div className={styles['error']}>
          <p>Failed to load {name}: {errorMessage}</p>
          <div className={styles['error-actions']}>
            <button 
              onClick={handleReload}
              className={styles['reload-button']}
              disabled={isLoading}
            >
              {isLoading ? '组件加载中...' : '重试加载'}
            </button>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        id={containerId}
        className={`${styles['micro-app']} ${isMounted ? styles.active : ''}`}
      />
    </div>
  )
}

export default MicroAppContainer 