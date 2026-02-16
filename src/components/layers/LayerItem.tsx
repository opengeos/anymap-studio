import { useState } from 'react'
import {
  Eye,
  EyeOff,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Map,
  Image,
  Hexagon
} from 'lucide-react'
import { useProjectStore } from '../../stores/projectStore'
import { useMapStore } from '../../stores/mapStore'
import type { UnifiedLayerConfig } from '../../types/project'

interface LayerItemProps {
  layer: UnifiedLayerConfig
}

const typeIcons: Record<string, React.ElementType> = {
  geojson: Hexagon,
  raster: Image,
  cog: Image,
  'vector-tiles': Map,
  pmtiles: Map,
  '3d-tiles': Hexagon,
  terrain: Map,
  'point-cloud': Hexagon
}

export function LayerItem({ layer }: LayerItemProps) {
  const [expanded, setExpanded] = useState(false)
  const { selectedLayerId, setSelectedLayer, toggleLayerVisibility, setLayerOpacity, removeLayer } =
    useProjectStore()
  const { backend } = useMapStore()

  const isSelected = selectedLayerId === layer.id
  const Icon = typeIcons[layer.type] || Map

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleLayerVisibility(layer.id)
    if (backend) {
      backend.updateLayer(layer.id, { visible: !layer.visible })
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeLayer(layer.id)
    if (backend) {
      backend.removeLayer(layer.id)
    }
  }

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const opacity = parseFloat(e.target.value)
    setLayerOpacity(layer.id, opacity)
    if (backend) {
      backend.updateLayer(layer.id, { opacity })
    }
  }

  const handleSelect = () => {
    setSelectedLayer(isSelected ? null : layer.id)
  }

  return (
    <div
      className={`rounded-lg border transition-all ${
        isSelected
          ? 'border-blue-500/50 bg-slate-800 ring-1 ring-blue-500/30'
          : 'border-slate-700 bg-slate-800/30 hover:bg-slate-800/60 hover:border-slate-600'
      }`}
    >
      <div
        className="flex cursor-pointer items-center gap-2 px-3 py-2.5"
        onClick={handleSelect}
      >
        <GripVertical className="h-3.5 w-3.5 cursor-grab text-slate-500" />

        <button
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(!expanded)
          }}
          className="p-0.5 rounded hover:bg-slate-700"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          )}
        </button>

        <Icon className="h-4 w-4 text-blue-400" />

        <span
          className={`flex-1 truncate text-sm ${
            layer.visible ? 'text-slate-200' : 'text-slate-500'
          }`}
        >
          {layer.name}
        </span>

        <button
          onClick={handleToggleVisibility}
          className="rounded p-1.5 hover:bg-slate-700"
          title={layer.visible ? 'Hide layer' : 'Show layer'}
        >
          {layer.visible ? (
            <Eye className="h-4 w-4 text-slate-400" />
          ) : (
            <EyeOff className="h-4 w-4 text-slate-500" />
          )}
        </button>

        <button
          onClick={handleDelete}
          className="rounded p-1.5 hover:bg-red-900/30"
          title="Remove layer"
        >
          <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-400" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-700 bg-slate-800/50 px-3 py-3">
          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Opacity</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={layer.opacity}
                onChange={handleOpacityChange}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-600"
              />
              <span className="w-10 text-right text-xs font-medium text-slate-300">
                {Math.round(layer.opacity * 100)}%
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-400 space-y-0.5">
            <div>Type: <span className="text-slate-300">{layer.type}</span></div>
            {layer.source.url && (
              <div className="truncate" title={layer.source.url}>
                Source: <span className="text-slate-300">{layer.source.url}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
