import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Eye, EyeOff, Trash2, ChevronDown, ChevronRight, GripVertical,
  Map, Image, Hexagon, Copy, Edit3, Palette, Table2, ZoomIn, Download,
  Flame, Info
} from 'lucide-react'
import maplibregl from 'maplibre-gl'
import { useProjectStore } from '../../stores/projectStore'
import { useMapStore } from '../../stores/mapStore'
import { useUIStore } from '../../stores/uiStore'
import type { UnifiedLayerConfig } from '../../types/project'
import { calculateBounds } from '../../utils/geo'
import { exportToGeoJSON } from '../../utils/export'

interface LayerItemProps {
  layer: UnifiedLayerConfig
  index: number
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDragEnd: () => void
}

const typeIcons: Record<string, React.ElementType> = {
  geojson: Hexagon, raster: Image, cog: Image, 'vector-tiles': Map,
  pmtiles: Map, '3d-tiles': Hexagon, terrain: Map, 'point-cloud': Hexagon
}

export function LayerItem({ layer, index, onDragStart, onDragOver, onDragEnd }: LayerItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState(layer.name)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 })
  const { selectedLayerId, setSelectedLayer, toggleLayerVisibility, setLayerOpacity, removeLayer, updateLayer, addLayer } = useProjectStore()
  const { backend } = useMapStore()
  const { setShowAttributeTable, setShowStyleEditor } = useUIStore()
  const renameInputRef = useRef<HTMLInputElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const isSelected = selectedLayerId === layer.id
  const Icon = typeIcons[layer.type] || Map

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [isRenaming])

  useEffect(() => {
    if (!showContextMenu) return
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) setShowContextMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showContextMenu])

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleLayerVisibility(layer.id)
    if (backend) backend.updateLayer(layer.id, { visible: !layer.visible })
  }

  const handleDelete = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    removeLayer(layer.id)
    if (backend) backend.removeLayer(layer.id)
  }

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const opacity = parseFloat(e.target.value)
    setLayerOpacity(layer.id, opacity)
    if (backend) backend.updateLayer(layer.id, { opacity })
  }

  const handleSelect = () => setSelectedLayer(isSelected ? null : layer.id)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
  }

  const handleRename = () => { setIsRenaming(true); setNewName(layer.name); setShowContextMenu(false) }
  const handleRenameConfirm = () => { if (newName.trim()) updateLayer(layer.id, { name: newName.trim() }); setIsRenaming(false) }
  const handleRenameKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleRenameConfirm(); if (e.key === 'Escape') setIsRenaming(false) }

  const handleDuplicate = () => {
    setShowContextMenu(false)
    const newLayer: UnifiedLayerConfig = { ...layer, id: `layer-${Date.now()}`, name: `${layer.name} (copy)` }
    addLayer(newLayer)
    if (backend) backend.addLayer(newLayer).catch(console.error)
  }

  const handleZoomToLayer = () => {
    setShowContextMenu(false)
    if (layer.type === 'geojson' && layer.source.data && backend) {
      const bounds = calculateBounds(layer.source.data as GeoJSON.GeoJSON)
      if (bounds) backend.fitBounds(bounds, 50)
    }
  }

  const handleOpenAttributes = () => {
    setShowContextMenu(false)
    if (layer.type === 'geojson' && layer.source.data) setShowAttributeTable(true, layer.id)
  }

  const handleOpenStyleEditor = () => { setShowContextMenu(false); setShowStyleEditor(true, layer.id) }

  const handleExportLayer = () => {
    setShowContextMenu(false)
    if (layer.type === 'geojson' && layer.source.data) exportToGeoJSON(layer.source.data as GeoJSON.GeoJSON, layer.name)
  }

  const handleGenerateHeatmap = () => {
    setShowContextMenu(false)
    if (!backend || layer.type !== 'geojson' || !layer.source.data) return

    const geojson = layer.source.data as GeoJSON.GeoJSON
    const map = backend.getNativeMap() as maplibregl.Map | null
    if (!map) return

    const heatmapSourceId = `${layer.id}-heatmap-source`
    const heatmapLayerId = `${layer.id}-heatmap`

    // Toggle: if heatmap exists, remove it
    if (map.getLayer(heatmapLayerId)) {
      map.removeLayer(heatmapLayerId)
      if (map.getSource(heatmapSourceId)) map.removeSource(heatmapSourceId)
      return
    }

    map.addSource(heatmapSourceId, { type: 'geojson', data: geojson })
    map.addLayer({
      id: heatmapLayerId,
      type: 'heatmap',
      source: heatmapSourceId,
      paint: {
        'heatmap-weight': 1,
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 4, 15, 30],
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 15, 0.5],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(33,102,172,0)',
          0.2, 'rgb(103,169,207)',
          0.4, 'rgb(209,229,240)',
          0.6, 'rgb(253,219,199)',
          0.8, 'rgb(239,138,98)',
          1, 'rgb(178,24,43)'
        ]
      }
    })
  }

  // Check if heatmap exists
  const hasHeatmap = (() => {
    if (!backend) return false
    const map = backend.getNativeMap() as maplibregl.Map | null
    return map ? !!map.getLayer(`${layer.id}-heatmap`) : false
  })()

  // Get feature count for metadata
  const featureCount = useMemo(() => {
    if (layer.type !== 'geojson' || !layer.source.data) return null
    const gj = layer.source.data as GeoJSON.GeoJSON
    if (gj.type === 'FeatureCollection') return gj.features.length
    if (gj.type === 'Feature') return 1
    return null
  }, [layer.source.data, layer.type])

  const geometryTypes = useMemo(() => {
    if (layer.type !== 'geojson' || !layer.source.data) return []
    const gj = layer.source.data as GeoJSON.GeoJSON
    const types = new Set<string>()
    if (gj.type === 'FeatureCollection') {
      gj.features.forEach(f => { if (f.geometry?.type) types.add(f.geometry.type) })
    } else if (gj.type === 'Feature' && gj.geometry) {
      types.add(gj.geometry.type)
    }
    return Array.from(types)
  }, [layer.source.data, layer.type])

  const isPointLayer = geometryTypes.length > 0 && geometryTypes.every(t => t === 'Point' || t === 'MultiPoint')

  return (
    <>
      <div
        className={`rounded-lg border transition-all ${
          isSelected
            ? 'border-blue-500/50 bg-slate-800 ring-1 ring-blue-500/30'
            : 'border-slate-700/60 bg-slate-800/20 hover:bg-slate-800/50 hover:border-slate-600'
        }`}
        draggable
        onDragStart={() => onDragStart(index)}
        onDragOver={(e) => onDragOver(e, index)}
        onDragEnd={onDragEnd}
        onContextMenu={handleContextMenu}
      >
        {/* Layer header row */}
        <div className="flex cursor-pointer items-center gap-2 px-3 py-2" onClick={handleSelect}>
          <GripVertical className="h-3.5 w-3.5 cursor-grab text-slate-600 hover:text-slate-400 flex-shrink-0" />

          <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }} className="p-0.5 rounded hover:bg-slate-700">
            {expanded
              ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            }
          </button>

          <Icon className="h-4 w-4 text-blue-400 flex-shrink-0" />

          {isRenaming ? (
            <input
              ref={renameInputRef} type="text" value={newName}
              onChange={e => setNewName(e.target.value)} onBlur={handleRenameConfirm}
              onKeyDown={handleRenameKeyDown} onClick={e => e.stopPropagation()}
              className="flex-1 min-w-0 rounded bg-slate-700 px-2 py-0.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          ) : (
            <span
              className={`flex-1 min-w-0 truncate text-[13px] ${layer.visible ? 'text-slate-200' : 'text-slate-500'}`}
              onDoubleClick={(e) => { e.stopPropagation(); handleRename() }}
            >
              {layer.name}
            </span>
          )}

          <button onClick={handleToggleVisibility} className="rounded p-1 hover:bg-slate-700 flex-shrink-0" title={layer.visible ? 'Hide' : 'Show'}>
            {layer.visible
              ? <Eye className="h-3.5 w-3.5 text-slate-400" />
              : <EyeOff className="h-3.5 w-3.5 text-slate-500" />
            }
          </button>

          <button onClick={(e) => handleDelete(e)} className="rounded p-1 hover:bg-red-900/30 flex-shrink-0" title="Remove">
            <Trash2 className="h-3.5 w-3.5 text-slate-500 hover:text-red-400" />
          </button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-slate-700/50 bg-slate-800/30 px-4 py-3 space-y-3">
            {/* Opacity */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Opacity</label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min="0" max="1" step="0.05" value={layer.opacity}
                  onChange={handleOpacityChange}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-600"
                />
                <span className="w-10 text-right text-xs tabular-nums font-medium text-slate-300">
                  {Math.round(layer.opacity * 100)}%
                </span>
              </div>
            </div>

            {/* Quick action buttons */}
            {layer.type === 'geojson' && (
              <div className="flex flex-wrap gap-2">
                <ActionButton icon={Palette} label="Style" onClick={handleOpenStyleEditor} />
                {layer.source.data != null && <ActionButton icon={Table2} label="Attributes" onClick={handleOpenAttributes} />}
                <ActionButton icon={ZoomIn} label="Zoom To" onClick={handleZoomToLayer} />
                {isPointLayer && (
                  <ActionButton icon={Flame} label={hasHeatmap ? 'Remove Heatmap' : 'Heatmap'} onClick={handleGenerateHeatmap} />
                )}
              </div>
            )}

            {/* Layer metadata/properties */}
            <div className="text-xs text-slate-500 space-y-1.5 pt-1 border-t border-slate-700/40 mt-1">
              <div className="flex items-center gap-1.5">
                <Info className="h-3 w-3 flex-shrink-0" />
                <span>Type: <span className="text-slate-400">{layer.type}</span></span>
              </div>
              {featureCount !== null && (
                <div className="pl-[18px]">Features: <span className="text-slate-400">{featureCount.toLocaleString()}</span></div>
              )}
              {geometryTypes.length > 0 && (
                <div className="pl-[18px]">Geometry: <span className="text-slate-400">{geometryTypes.join(', ')}</span></div>
              )}
              {layer.source.url && (
                <div className="pl-[18px] truncate" title={layer.source.url}>
                  Source: <span className="text-slate-400">{layer.source.url}</span>
                </div>
              )}
              {layer.style?.fillColor && (
                <div className="pl-[18px] flex items-center gap-1.5">
                  Fill:
                  <span className="inline-block h-3 w-3 rounded-sm border border-slate-600" style={{ backgroundColor: layer.style.fillColor }} />
                  <span className="text-slate-400">{layer.style.fillColor}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[70] rounded-xl bg-slate-800 border border-slate-600 shadow-2xl py-2 min-w-[190px]"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
        >
          <CtxItem icon={Edit3} label="Rename" onClick={handleRename} />
          <CtxItem icon={Copy} label="Duplicate" onClick={handleDuplicate} />
          <CtxItem icon={ZoomIn} label="Zoom to Layer" onClick={handleZoomToLayer} disabled={layer.type !== 'geojson'} />
          <div className="my-1.5 mx-3 border-t border-slate-700/60" />
          {layer.type === 'geojson' && (
            <>
              <CtxItem icon={Table2} label="Attribute Table" onClick={handleOpenAttributes} disabled={!layer.source.data} />
              <CtxItem icon={Palette} label="Edit Style" onClick={handleOpenStyleEditor} />
              <CtxItem icon={Download} label="Export Layer" onClick={handleExportLayer} disabled={!layer.source.data} />
              {isPointLayer && (
                <CtxItem icon={Flame} label={hasHeatmap ? 'Remove Heatmap' : 'Generate Heatmap'} onClick={handleGenerateHeatmap} />
              )}
              <div className="my-1.5 mx-3 border-t border-slate-700/60" />
            </>
          )}
          <CtxItem
            icon={layer.visible ? EyeOff : Eye}
            label={layer.visible ? 'Hide' : 'Show'}
            onClick={() => { handleToggleVisibility({ stopPropagation: () => {} } as React.MouseEvent); setShowContextMenu(false) }}
          />
          <CtxItem icon={Trash2} label="Remove" onClick={() => { handleDelete(); setShowContextMenu(false) }} danger />
        </div>
      )}
    </>
  )
}

function ActionButton({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md bg-slate-700/60 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-600 transition-colors"
    >
      <Icon className="h-3 w-3" /> {label}
    </button>
  )
}

function CtxItem({ icon: Icon, label, onClick, disabled, danger }: {
  icon: React.ElementType; label: string; onClick: () => void; disabled?: boolean; danger?: boolean
}) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className={`flex w-full items-center gap-3 px-4 py-2 text-[13px] transition-colors disabled:opacity-40 ${
        danger ? 'text-red-400 hover:bg-red-900/20' : 'text-slate-300 hover:bg-slate-700/60'
      }`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" /> {label}
    </button>
  )
}
