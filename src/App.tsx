import { useEffect } from 'react'
import { useUIStore } from './stores/uiStore'
import { useProjectStore } from './stores/projectStore'
import { LandingPage } from './components/landing/LandingPage'
import { AppShell } from './components/layout/AppShell'

declare global {
  interface Window {
    electronAPI: typeof import('./types/electron-api').electronAPI
  }
}

function App() {
  const { view } = useUIStore()
  const { loadProject, setDirty } = useProjectStore()

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    api.onNewProject(() => {
      useUIStore.getState().setView('landing')
    })

    api.onOpenProject((filePath, content) => {
      try {
        const project = JSON.parse(content)
        loadProject(project, filePath)
        useUIStore.getState().setView('map')
      } catch (e) {
        console.error('Failed to parse project file:', e)
      }
    })

    api.onSaveProject(() => {
      const store = useProjectStore.getState()
      if (store.filePath) {
        const content = JSON.stringify(store.exportProject(), null, 2)
        api.writeFile(store.filePath, content)
        setDirty(false)
      } else {
        api.showSaveDialog().then(result => {
          if (!result.canceled && result.filePath) {
            const content = JSON.stringify(store.exportProject(), null, 2)
            api.writeFile(result.filePath, content)
            useProjectStore.getState().setFilePath(result.filePath)
            setDirty(false)
          }
        })
      }
    })

    api.onSaveProjectAs(() => {
      const store = useProjectStore.getState()
      api.showSaveDialog(store.filePath ?? undefined).then(result => {
        if (!result.canceled && result.filePath) {
          const content = JSON.stringify(store.exportProject(), null, 2)
          api.writeFile(result.filePath, content)
          useProjectStore.getState().setFilePath(result.filePath)
          setDirty(false)
        }
      })
    })

    api.onCloseProject(async () => {
      const store = useProjectStore.getState()
      if (store.isDirty) {
        const choice = await api.showSaveBeforeLeaveDialog()
        if (choice === 'cancel') return
        if (choice === 'save') {
          if (store.filePath) {
            const content = JSON.stringify(store.exportProject(), null, 2)
            await api.writeFile(store.filePath, content)
          }
        }
      }
      useProjectStore.getState().reset()
      useUIStore.getState().setView('landing')
    })
  }, [loadProject, setDirty])

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    api.updateMenuState(view === 'map')
  }, [view])

  return (
    <div className="h-full w-full bg-background text-foreground">
      {view === 'landing' ? <LandingPage /> : <AppShell />}
    </div>
  )
}

export default App
