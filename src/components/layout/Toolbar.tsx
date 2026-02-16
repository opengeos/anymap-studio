import {
  Home,
  ZoomIn,
  ZoomOut,
  Maximize2,
  PanelLeftClose,
  PanelLeft,
  Save,
  Ruler,
  Square,
  Circle,
  Minus,
  Pentagon,
  MousePointer,
  MapPin,
  Download,
  Command
} from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { useMapStore } from '../../stores/mapStore'
import { calculateBounds as computeBounds } from '../../utils/geo'

export function Toolbar() {
  const { sidebarOpen, toggleSidebar, setView, activeTool, setActiveTool, clearMeasurement, setShowGoToCoordinates, setShowExportDialog, setShowCommandPalette } = useUIStore()
  const { name, isDirty, filePath } = useProjectStore()
  const { backend, zoom } = useMapStore()

  const handleMeasureDistance = () => {
    if (activeTool === 'measure-distance') {
      clearMeasurement()
    } else {
      setActiveTool('measure-distance')
    }
  }

  const handleMeasureArea = () => {
    if (activeTool === 'measure-area') {
      clearMeasurement()
    } else {
      setActiveTool('measure-area')
    }
  }

  const handleDraw = (tool: 'draw-point' | 'draw-line' | 'draw-polygon') => {
    if (activeTool === tool) {
      setActiveTool('none')
    } else {
      setActiveTool(tool)
    }
  }

  const handleIdentify = () => {
    if (activeTool === 'identify') {
      setActiveTool('none')
    } else {
      setActiveTool('identify')
    }
  }

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
    if (!backend) return
    const projectLayers = useProjectStore.getState().layers
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
    let hasBounds = false

    for (const layer of projectLayers) {
      if (layer.type === 'geojson' && layer.source.data && layer.visible) {
        const geojson = layer.source.data as GeoJSON.GeoJSON
        const bounds = computeBounds(geojson)
        if (bounds) {
          hasBounds = true
          if (bounds[0][0] < minLng) minLng = bounds[0][0]
          if (bounds[0][1] < minLat) minLat = bounds[0][1]
          if (bounds[1][0] > maxLng) maxLng = bounds[1][0]
          if (bounds[1][1] > maxLat) maxLat = bounds[1][1]
        }
      }
    }

    if (hasBounds) {
      backend.fitBounds([[minLng, minLat], [maxLng, maxLat]], 50)
    }
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
      <div className="flex items-center gap-1">
        <button
          onClick={toggleSidebar}
          className="rounded p-1.5 hover:bg-slate-700"
          title={sidebarOpen ? 'Hide sidebar (Ctrl+B)' : 'Show sidebar (Ctrl+B)'}
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

        <div className="mx-1.5 h-6 w-px bg-slate-700" />

        <button
          onClick={handleSave}
          className="rounded p-1.5 hover:bg-slate-700"
          title="Save project (Ctrl+S)"
        >
          <Save className="h-5 w-5 text-slate-400" />
        </button>

        <div className="mx-1.5 h-6 w-px bg-slate-700" />

        <button
          onClick={handleIdentify}
          className={`rounded p-1.5 ${activeTool === 'identify' ? 'bg-amber-600' : 'hover:bg-slate-700'}`}
          title="Identify features (I)"
        >
          <MousePointer className={`h-5 w-5 ${activeTool === 'identify' ? 'text-white' : 'text-slate-400'}`} />
        </button>

        <button
          onClick={handleMeasureDistance}
          className={`rounded p-1.5 ${activeTool === 'measure-distance' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
          title="Measure distance (M)"
        >
          <Ruler className={`h-5 w-5 ${activeTool === 'measure-distance' ? 'text-white' : 'text-slate-400'}`} />
        </button>

        <button
          onClick={handleMeasureArea}
          className={`rounded p-1.5 ${activeTool === 'measure-area' ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
          title="Measure area"
        >
          <Square className={`h-5 w-5 ${activeTool === 'measure-area' ? 'text-white' : 'text-slate-400'}`} />
        </button>

        <div className="mx-1.5 h-6 w-px bg-slate-700" />

        <button
          onClick={() => handleDraw('draw-point')}
          className={`rounded p-1.5 ${activeTool === 'draw-point' ? 'bg-green-600' : 'hover:bg-slate-700'}`}
          title="Draw points"
        >
          <Circle className={`h-5 w-5 ${activeTool === 'draw-point' ? 'text-white' : 'text-slate-400'}`} />
        </button>

        <button
          onClick={() => handleDraw('draw-line')}
          className={`rounded p-1.5 ${activeTool === 'draw-line' ? 'bg-green-600' : 'hover:bg-slate-700'}`}
          title="Draw line"
        >
          <Minus className={`h-5 w-5 ${activeTool === 'draw-line' ? 'text-white' : 'text-slate-400'}`} />
        </button>

        <button
          onClick={() => handleDraw('draw-polygon')}
          className={`rounded p-1.5 ${activeTool === 'draw-polygon' ? 'bg-green-600' : 'hover:bg-slate-700'}`}
          title="Draw polygon"
        >
          <Pentagon className={`h-5 w-5 ${activeTool === 'draw-polygon' ? 'text-white' : 'text-slate-400'}`} />
        </button>

        <div className="mx-1.5 h-6 w-px bg-slate-700" />

        <button
          onClick={() => setShowGoToCoordinates(true)}
          className="rounded p-1.5 hover:bg-slate-700"
          title="Go to coordinates (Ctrl+G)"
        >
          <MapPin className="h-5 w-5 text-slate-400" />
        </button>

        <button
          onClick={() => setShowExportDialog(true)}
          className="rounded p-1.5 hover:bg-slate-700"
          title="Export (Ctrl+E)"
        >
          <Download className="h-5 w-5 text-slate-400" />
        </button>

        <button
          onClick={() => setShowCommandPalette(true)}
          className="rounded p-1.5 hover:bg-slate-700"
          title="Command palette (Ctrl+Shift+P)"
        >
          <Command className="h-5 w-5 text-slate-400" />
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
          title="Fit to all layers (Ctrl+0)"
        >
          <Maximize2 className="h-5 w-5 text-slate-400" />
        </button>
      </div>
    </header>
  )
}
