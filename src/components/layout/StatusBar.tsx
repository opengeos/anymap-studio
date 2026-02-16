import { useMapStore } from '../../stores/mapStore'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import { BACKEND_INFO } from '../../backends/capabilities'
import { formatCoordinate, calculateScale, formatScale } from '../../utils/geo'

export function StatusBar() {
  const { cursorPosition, zoom, backendType } = useMapStore()
  const { layers } = useProjectStore()
  const { coordinateFormat } = useUIStore()

  const backendInfo = BACKEND_INFO[backendType]
  const visibleLayers = layers.filter((l) => l.visible).length

  const scale = cursorPosition
    ? calculateScale(cursorPosition.lat, zoom)
    : calculateScale(0, zoom)

  return (
    <footer className="flex h-6 items-center justify-between border-t border-slate-700 bg-slate-900 px-3 text-xs text-slate-400">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <span className="font-medium text-slate-300">{backendInfo.name}</span>
        </span>

        <span>
          {visibleLayers} / {layers.length} layers
        </span>

        <span className="text-slate-500">CRS: EPSG:3857</span>
      </div>

      <div className="flex items-center gap-4">
        {cursorPosition && (
          <span title="Click to toggle format">
            {coordinateFormat === 'dms'
              ? formatCoordinate(cursorPosition.lng, cursorPosition.lat, 'dms')
              : `${cursorPosition.lng.toFixed(5)}, ${cursorPosition.lat.toFixed(5)}`
            }
          </span>
        )}

        <span>Zoom: {zoom.toFixed(2)}</span>

        <span className="text-slate-500">{formatScale(scale)}</span>
      </div>
    </footer>
  )
}
