import { useMapStore } from '../../stores/mapStore'
import { useProjectStore } from '../../stores/projectStore'
import { BACKEND_INFO } from '../../backends/capabilities'

export function StatusBar() {
  const { cursorPosition, zoom, backendType } = useMapStore()
  const { layers } = useProjectStore()

  const backendInfo = BACKEND_INFO[backendType]
  const visibleLayers = layers.filter((l) => l.visible).length

  return (
    <footer className="flex h-6 items-center justify-between border-t border-slate-700 bg-slate-900 px-3 text-xs text-slate-400">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <span className="font-medium text-slate-300">{backendInfo.name}</span>
        </span>

        <span>
          {visibleLayers} / {layers.length} layers visible
        </span>
      </div>

      <div className="flex items-center gap-4">
        {cursorPosition && (
          <span>
            {cursorPosition.lng.toFixed(5)}, {cursorPosition.lat.toFixed(5)}
          </span>
        )}

        <span>Zoom: {zoom.toFixed(2)}</span>
      </div>
    </footer>
  )
}
