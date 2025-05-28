import MicroAppContainer from '@/src/components/micro-frontend/MicroAppContainer'

function App() {
  const handleBeforeLoad = async () => {
    console.log('Starting to load micro-frontend...')
  }

  const handleAfterMount = async () => {
    console.log('Micro-frontend mounted successfully')
  }

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <MicroAppContainer
        name="b2c-scrapy"
        entry="http://localhost:8080"
        activeRule="/b2c-scrapy"
        onBeforeLoad={handleBeforeLoad}
        onAfterMount={handleAfterMount}
      />
    </div>
  )
}

export default App
