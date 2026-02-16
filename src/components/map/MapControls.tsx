import { ZoomIn, ZoomOut, Compass, Maximize2 } from 'lucide-react'
import { useMapStore } from '../../stores/mapStore'

export function MapControls() {
  const { backend } = useMapStore()

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

  const handleResetNorth = () => {
    if (backend) {
      const view = backend.getView()
      backend.setView({ ...view, bearing: 0, pitch: 0 })
    }
  }

  const handleFitBounds = () => {
    // TODO: Calculate bounds from all layers
  }

  return (
    <div className="absolute right-3 top-3 flex flex-col gap-1">
      <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg">
        <button
          onClick={handleZoomIn}
          className="flex h-8 w-8 items-center justify-center hover:bg-accent"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4 text-foreground" />
        </button>
        <div className="h-px bg-border" />
        <button
          onClick={handleZoomOut}
          className="flex h-8 w-8 items-center justify-center hover:bg-accent"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4 text-foreground" />
        </button>
      </div>

      <button
        onClick={handleResetNorth}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card shadow-lg hover:bg-accent"
        title="Reset north"
      >
        <Compass className="h-4 w-4 text-foreground" />
      </button>

      <button
        onClick={handleFitBounds}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card shadow-lg hover:bg-accent"
        title="Fit to bounds"
      >
        <Maximize2 className="h-4 w-4 text-foreground" />
      </button>
    </div>
  )
}
