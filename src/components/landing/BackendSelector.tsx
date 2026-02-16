import {
  Map,
  Globe,
  Layers,
  Compass,
  BarChart3,
  Globe2,
  Telescope,
  ScatterChart,
  Check,
  X
} from 'lucide-react'
import { BACKEND_INFO } from '../../backends/capabilities'
import type { BackendType } from '../../backends/types'

interface BackendSelectorProps {
  onSelect: (backend: BackendType) => void
}

const iconMap: Record<string, React.ElementType> = {
  map: Map,
  globe: Globe,
  layers: Layers,
  compass: Compass,
  'bar-chart-3': BarChart3,
  'globe-2': Globe2,
  telescope: Telescope,
  'scatter-chart': ScatterChart
}

const backendOrder: BackendType[] = [
  'maplibre',
  'cesium',
  'deckgl',
  'openlayers',
  'leaflet',
  'mapbox',
  'keplergl',
  'potree'
]

export function BackendSelector({ onSelect }: BackendSelectorProps) {
  return (
    <div className="grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {backendOrder.map((type) => {
        const info = BACKEND_INFO[type]
        const Icon = iconMap[info.icon] || Map
        const isImplemented = type === 'maplibre'

        return (
          <button
            key={type}
            onClick={() => onSelect(type)}
            disabled={!isImplemented}
            className={`group flex flex-col rounded-lg border p-4 text-left transition-all ${
              isImplemented
                ? 'border-border bg-card hover:border-primary hover:bg-accent'
                : 'cursor-not-allowed border-border/50 bg-card/50 opacity-60'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Icon className="h-5 w-5 text-foreground" />
              </div>
              {isImplemented && (
                <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                  Ready
                </span>
              )}
              {!isImplemented && (
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                  Coming Soon
                </span>
              )}
            </div>

            <h3 className="mb-1 font-semibold text-foreground">{info.name}</h3>
            <p className="mb-3 text-xs text-muted-foreground">{info.description}</p>

            <div className="mt-auto space-y-2">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Best for:</p>
                <div className="flex flex-wrap gap-1">
                  {info.recommended.slice(0, 3).map((rec) => (
                    <span
                      key={rec}
                      className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-foreground"
                    >
                      {rec}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-2 text-[10px]">
                <div className="flex items-center gap-1">
                  {info.capabilities.supports2D ? (
                    <Check className="h-3 w-3 text-green-400" />
                  ) : (
                    <X className="h-3 w-3 text-red-400" />
                  )}
                  <span className="text-muted-foreground">2D</span>
                </div>
                <div className="flex items-center gap-1">
                  {info.capabilities.supports3D ? (
                    <Check className="h-3 w-3 text-green-400" />
                  ) : (
                    <X className="h-3 w-3 text-red-400" />
                  )}
                  <span className="text-muted-foreground">3D</span>
                </div>
                <div className="flex items-center gap-1">
                  {info.capabilities.supportsVectorTiles ? (
                    <Check className="h-3 w-3 text-green-400" />
                  ) : (
                    <X className="h-3 w-3 text-red-400" />
                  )}
                  <span className="text-muted-foreground">Vector</span>
                </div>
                <div className="flex items-center gap-1">
                  {info.capabilities.supportsTerrain ? (
                    <Check className="h-3 w-3 text-green-400" />
                  ) : (
                    <X className="h-3 w-3 text-red-400" />
                  )}
                  <span className="text-muted-foreground">Terrain</span>
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
