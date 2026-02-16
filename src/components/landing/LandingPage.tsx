import { FolderOpen } from 'lucide-react'
import { BackendSelector } from './BackendSelector'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import type { BackendType } from '../../backends/types'

export function LandingPage() {
  const { setBackend } = useProjectStore()
  const { setView } = useUIStore()

  const handleSelectBackend = (backend: BackendType) => {
    setBackend(backend)
    setView('map')
  }

  const handleOpenProject = async () => {
    const api = window.electronAPI
    if (!api) return

    const result = await api.showProjectOpenDialog()
    if (!result.canceled && result.content) {
      try {
        const project = JSON.parse(result.content)
        useProjectStore.getState().loadProject(project, result.filePath)
        setView('map')
      } catch (e) {
        console.error('Failed to parse project file:', e)
      }
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center bg-background p-8">
      <div className="mb-12 text-center">
        <h1 className="mb-2 text-4xl font-bold text-foreground">AnyMap Studio</h1>
        <p className="text-lg text-muted-foreground">
          Modern GIS desktop application with multi-backend mapping
        </p>
      </div>

      <div className="mb-8 flex gap-4">
        <button
          onClick={handleOpenProject}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-foreground hover:bg-accent"
        >
          <FolderOpen className="h-5 w-5" />
          Open Project
        </button>
      </div>

      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold text-foreground">Start New Project</h2>
        <p className="text-sm text-muted-foreground">Choose a mapping backend</p>
      </div>

      <BackendSelector onSelect={handleSelectBackend} />

      <div className="mt-12 text-center text-xs text-muted-foreground">
        <p>Built with anymap-ts, Electron, and React</p>
      </div>
    </div>
  )
}
