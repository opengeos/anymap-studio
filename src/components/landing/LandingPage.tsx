import { useState, useEffect } from 'react'
import { FolderOpen, Clock, X } from 'lucide-react'
import { BackendSelector } from './BackendSelector'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import type { BackendType } from '../../backends/types'
import type { RecentProject } from '../../types/project'

export function LandingPage() {
  const { setBackend } = useProjectStore()
  const { setView } = useUIStore()
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])

  useEffect(() => {
    setRecentProjects(useProjectStore.getState().getRecentProjects())
  }, [])

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

  const handleOpenRecent = async (path: string) => {
    const api = window.electronAPI
    if (!api) return

    try {
      const result = await api.readFile(path)
      if (result?.content) {
        const project = JSON.parse(result.content)
        useProjectStore.getState().loadProject(project, path)
        setView('map')
      }
    } catch (e) {
      console.error('Failed to open recent project:', e)
      // Remove from recent if it fails
      try {
        const stored = localStorage.getItem('anymap-recent-projects')
        const recent: RecentProject[] = stored ? JSON.parse(stored) : []
        localStorage.setItem('anymap-recent-projects', JSON.stringify(recent.filter(r => r.path !== path)))
        setRecentProjects(prev => prev.filter(r => r.path !== path))
      } catch { /* ignore */ }
    }
  }

  const handleRemoveRecent = (path: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const stored = localStorage.getItem('anymap-recent-projects')
      const recent: RecentProject[] = stored ? JSON.parse(stored) : []
      localStorage.setItem('anymap-recent-projects', JSON.stringify(recent.filter(r => r.path !== path)))
      setRecentProjects(prev => prev.filter(r => r.path !== path))
    } catch { /* ignore */ }
  }

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    } catch { return '' }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center bg-background p-8">
      <div className="mb-10 text-center">
        <h1 className="mb-2 text-4xl font-bold text-foreground">AnyMap Studio</h1>
        <p className="text-lg text-muted-foreground">
          Modern GIS desktop application with multi-backend mapping
        </p>
      </div>

      <div className="mb-8 flex gap-4">
        <button
          onClick={handleOpenProject}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-foreground hover:bg-accent transition-colors"
        >
          <FolderOpen className="h-5 w-5" />
          Open Project
        </button>
      </div>

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <div className="mb-8 w-full max-w-md">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            Recent Projects
          </h3>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {recentProjects.map((project, i) => (
              <button
                key={project.path}
                onClick={() => handleOpenRecent(project.path)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors group ${
                  i > 0 ? 'border-t border-border' : ''
                }`}
              >
                <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{project.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{project.path}</div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(project.lastOpened)}</span>
                <button
                  onClick={(e) => handleRemoveRecent(project.path, e)}
                  className="rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-600 transition-all"
                  title="Remove from recent"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

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
