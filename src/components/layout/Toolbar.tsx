import {
  Home,
  ZoomIn,
  ZoomOut,
  Maximize2,
  PanelLeftClose,
  PanelLeft,
  Save
} from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { useMapStore } from '../../stores/mapStore'

export function Toolbar() {
  const { sidebarOpen, toggleSidebar, setView } = useUIStore()
  const { name, isDirty, filePath } = useProjectStore()
  const { backend, zoom } = useMapStore()

  const handleGoHome = async () => {
    const api = window.electronAPI
    if (!api) return

    const store = useProjectStore.getState()
    if (store.isDirty) {
      const choice = await api.showSaveBeforeLeaveDialog()
      if (choice === 'cancel') return
      if (choice === 'save' && filePath) {
        const content = JSON.stringify(store.exportProject(), null, 2)
        await api.writeFile(filePath, content)
      }
    }

    useProjectStore.getState().reset()
    setView('landing')
  }

  const handleZoomIn = () => {
    if (backend) {
      const view = backend.getView()
      backend.setView({ ...view, zoom: view.zoom + 1 })
    }
  }

  const handleZoomOut = () => {
    if (backend) {
      const view = backend.getView()
      backend.setView({ ...view, zoom: Math.max(0, view.zoom - 1) })
    }
  }

  const handleFitBounds = () => {
    // Will implement based on layer extents
  }

  const handleSave = async () => {
    const api = window.electronAPI
    if (!api) return

    const store = useProjectStore.getState()
    if (store.filePath) {
      const content = JSON.stringify(store.exportProject(), null, 2)
      await api.writeFile(store.filePath, content)
      useProjectStore.getState().setDirty(false)
    } else {
      const result = await api.showSaveDialog()
      if (!result.canceled && result.filePath) {
        const content = JSON.stringify(store.exportProject(), null, 2)
        await api.writeFile(result.filePath, content)
        useProjectStore.getState().setFilePath(result.filePath)
        useProjectStore.getState().setDirty(false)
      }
    }
  }

  return (
    <header className="flex h-12 items-center border-b border-slate-700 bg-slate-900 px-3">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="rounded p-1.5 hover:bg-slate-700"
          title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-5 w-5 text-slate-400" />
          ) : (
            <PanelLeft className="h-5 w-5 text-slate-400" />
          )}
        </button>

        <button
          onClick={handleGoHome}
          className="rounded p-1.5 hover:bg-slate-700"
          title="Go to start page"
        >
          <Home className="h-5 w-5 text-slate-400" />
        </button>

        <div className="mx-2 h-6 w-px bg-slate-700" />

        <button
          onClick={handleSave}
          className="rounded p-1.5 hover:bg-slate-700"
          title="Save project"
        >
          <Save className="h-5 w-5 text-slate-400" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <h1 className="text-sm font-medium text-slate-200">
          {name}
          {isDirty && <span className="ml-1 text-slate-500">*</span>}
        </h1>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleZoomOut}
          className="rounded p-1.5 hover:bg-slate-700"
          title="Zoom out"
        >
          <ZoomOut className="h-5 w-5 text-slate-400" />
        </button>

        <span className="min-w-[3rem] text-center text-xs text-slate-400">
          {zoom.toFixed(1)}x
        </span>

        <button
          onClick={handleZoomIn}
          className="rounded p-1.5 hover:bg-slate-700"
          title="Zoom in"
        >
          <ZoomIn className="h-5 w-5 text-slate-400" />
        </button>

        <button
          onClick={handleFitBounds}
          className="rounded p-1.5 hover:bg-slate-700"
          title="Fit to bounds"
        >
          <Maximize2 className="h-5 w-5 text-slate-400" />
        </button>
      </div>
    </header>
  )
}
