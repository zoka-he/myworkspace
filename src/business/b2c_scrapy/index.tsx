import MicroAppContainer from '@/src/components/micro-frontend/MicroAppContainer'
import { Radio } from 'antd'
import { useEffect, useState } from 'react'

type EnvMap = {
  [key: string]: {
    entry: string
    appName: string
  }
}


function App() {

  const [env, setEnv] = useState('develop')
  const [entry, setEntry] = useState('http://localhost:8080')
  const [appName, setAppName] = useState('b2c-scrapy-develop')

  const handleBeforeLoad = async () => {
    console.log('Starting to load micro-frontend...')
  }

  const handleAfterMount = async () => {
    console.log('Micro-frontend mounted successfully')
  }

  useEffect(() => {
    const envMap: EnvMap = {
      develop: {
        entry: 'http://localhost:8080',
        appName: 'b2c-scrapy-develop'
      },
      production: {
        entry: 'http://localhost:23005',
        appName: 'b2c-scrapy-production'
      }
    }

    setAppName(envMap[env].appName)
    setEntry(envMap[env].entry)
  }, [env])

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div>
        <Radio.Group size='small' value={env} onChange={(e) => setEnv(e.target.value)}>
          <Radio value='develop'>开发</Radio>
          <Radio value='production'>生产</Radio>
        </Radio.Group>
      </div>


      <div style={{ flex: 1 }}>
        <MicroAppContainer
          name={appName}
          entry={entry}
          activeRule="/b2c-scrapy"
          onBeforeLoad={handleBeforeLoad}
          onAfterMount={handleAfterMount}
        />
      </div>
    </div>
  )
}

export default App
