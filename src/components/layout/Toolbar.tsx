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

function ToolbarSeparator() {
  return <div className="mx-1 h-6 w-px bg-slate-700/70" />
}

function ToolbarButton({ onClick, active, activeColor, title, children }: {
  onClick: () => void
  active?: boolean
  activeColor?: string
  title: string
  children: React.ReactNode
}) {
  const bg = active
    ? activeColor === 'green' ? 'bg-green-600' : activeColor === 'amber' ? 'bg-amber-600' : 'bg-blue-600'
    : 'hover:bg-slate-700/80'
  return (
    <button onClick={onClick} className={`rounded-md p-2 transition-colors ${bg}`} title={title}>
      {children}
    </button>
  )
}

export function Toolbar() {
  const { sidebarOpen, toggleSidebar, setView, activeTool, setActiveTool, clearMeasurement, setShowGoToCoordinates, setShowExportDialog, setShowCommandPalette } = useUIStore()
  const { name, isDirty, filePath } = useProjectStore()
  const { backend, zoom } = useMapStore()

  const handleMeasureDistance = () => {
    activeTool === 'measure-distance' ? clearMeasurement() : setActiveTool('measure-distance')
  }

  const handleMeasureArea = () => {
    activeTool === 'measure-area' ? clearMeasurement() : setActiveTool('measure-area')
  }

  const handleDraw = (tool: 'draw-point' | 'draw-line' | 'draw-polygon') => {
    activeTool === tool ? setActiveTool('none') : setActiveTool(tool)
  }

  const handleIdentify = () => {
    activeTool === 'identify' ? setActiveTool('none') : setActiveTool('identify')
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
    if (backend) { const v = backend.getView(); backend.setView({ ...v, zoom: v.zoom + 1 }) }
  }

  const handleZoomOut = () => {
    if (backend) { const v = backend.getView(); backend.setView({ ...v, zoom: Math.max(0, v.zoom - 1) }) }
  }

  const handleFitBounds = () => {
    if (!backend) return
    const projectLayers = useProjectStore.getState().layers
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
    let hasBounds = false
    for (const layer of projectLayers) {
      if (layer.type === 'geojson' && layer.source.data && layer.visible) {
        const bounds = computeBounds(layer.source.data as GeoJSON.GeoJSON)
        if (bounds) {
          hasBounds = true
          if (bounds[0][0] < minLng) minLng = bounds[0][0]
          if (bounds[0][1] < minLat) minLat = bounds[0][1]
          if (bounds[1][0] > maxLng) maxLng = bounds[1][0]
          if (bounds[1][1] > maxLat) maxLat = bounds[1][1]
        }
      }
    }
    if (hasBounds) backend.fitBounds([[minLng, minLat], [maxLng, maxLat]], 50)
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

  const iconCls = (active?: boolean) => `h-[18px] w-[18px] ${active ? 'text-white' : 'text-slate-400'}`

  return (
    <header className="flex h-11 items-center border-b border-slate-700 bg-slate-900 px-4 gap-1">
      {/* Left: Navigation & Project */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton onClick={toggleSidebar} title={sidebarOpen ? 'Hide sidebar (Ctrl+B)' : 'Show sidebar (Ctrl+B)'}>
          {sidebarOpen
            ? <PanelLeftClose className={iconCls()} />
            : <PanelLeft className={iconCls()} />
          }
        </ToolbarButton>
        <ToolbarButton onClick={handleGoHome} title="Go to start page">
          <Home className={iconCls()} />
        </ToolbarButton>
        <ToolbarButton onClick={handleSave} title="Save project (Ctrl+S)">
          <Save className={iconCls()} />
        </ToolbarButton>
      </div>

      <ToolbarSeparator />

      {/* Selection & Measurement tools */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton onClick={handleIdentify} active={activeTool === 'identify'} activeColor="amber" title="Identify features (I)">
          <MousePointer className={iconCls(activeTool === 'identify')} />
        </ToolbarButton>
        <ToolbarButton onClick={handleMeasureDistance} active={activeTool === 'measure-distance'} title="Measure distance (M)">
          <Ruler className={iconCls(activeTool === 'measure-distance')} />
        </ToolbarButton>
        <ToolbarButton onClick={handleMeasureArea} active={activeTool === 'measure-area'} title="Measure area">
          <Square className={iconCls(activeTool === 'measure-area')} />
        </ToolbarButton>
      </div>

      <ToolbarSeparator />

      {/* Drawing tools */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton onClick={() => handleDraw('draw-point')} active={activeTool === 'draw-point'} activeColor="green" title="Draw points">
          <Circle className={iconCls(activeTool === 'draw-point')} />
        </ToolbarButton>
        <ToolbarButton onClick={() => handleDraw('draw-line')} active={activeTool === 'draw-line'} activeColor="green" title="Draw line">
          <Minus className={iconCls(activeTool === 'draw-line')} />
        </ToolbarButton>
        <ToolbarButton onClick={() => handleDraw('draw-polygon')} active={activeTool === 'draw-polygon'} activeColor="green" title="Draw polygon">
          <Pentagon className={iconCls(activeTool === 'draw-polygon')} />
        </ToolbarButton>
      </div>

      <ToolbarSeparator />

      {/* Utility tools */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton onClick={() => setShowGoToCoordinates(true)} title="Go to coordinates (Ctrl+G)">
          <MapPin className={iconCls()} />
        </ToolbarButton>
        <ToolbarButton onClick={() => setShowExportDialog(true)} title="Export (Ctrl+E)">
          <Download className={iconCls()} />
        </ToolbarButton>
        <ToolbarButton onClick={() => setShowCommandPalette(true)} title="Command palette (Ctrl+Shift+P)">
          <Command className={iconCls()} />
        </ToolbarButton>
      </div>

      {/* Center: Project name */}
      <div className="flex flex-1 items-center justify-center min-w-0 px-4">
        <h1 className="truncate text-sm font-medium text-slate-200">
          {name}
          {isDirty && <span className="ml-1 text-slate-500">*</span>}
        </h1>
      </div>

      {/* Right: Zoom controls */}
      <div className="flex items-center gap-1">
        <ToolbarButton onClick={handleZoomOut} title="Zoom out">
          <ZoomOut className={iconCls()} />
        </ToolbarButton>
        <span className="min-w-[3.5rem] text-center text-xs tabular-nums text-slate-400">
          {zoom.toFixed(1)}x
        </span>
        <ToolbarButton onClick={handleZoomIn} title="Zoom in">
          <ZoomIn className={iconCls()} />
        </ToolbarButton>
        <ToolbarButton onClick={handleFitBounds} title="Fit to all layers (Ctrl+0)">
          <Maximize2 className={iconCls()} />
        </ToolbarButton>
      </div>
    </header>
  )
}
