import { useState, useEffect } from 'react'
import { X, Palette } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { useMapStore } from '../../stores/mapStore'
import type { LayerStyle } from '../../types/project'

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
  '#6366f1', '#84cc16', '#e11d48', '#0ea5e9', '#d946ef',
  '#fbbf24', '#34d399', '#fb923c', '#818cf8', '#f472b6'
]

export function StyleEditor() {
  const { showStyleEditor, styleEditorLayerId, setShowStyleEditor } = useUIStore()
  const { layers, updateLayer } = useProjectStore()
  const { backend } = useMapStore()

  const layer = layers.find(l => l.id === styleEditorLayerId)
  const [style, setStyle] = useState<LayerStyle>({})

  useEffect(() => {
    if (layer?.style) {
      setStyle({ ...layer.style })
    }
  }, [layer?.id, layer?.style])

  if (!showStyleEditor || !styleEditorLayerId || !layer) return null

  const isVector = layer.type === 'geojson'

  const applyStyle = (updates: Partial<LayerStyle>) => {
    const newStyle = { ...style, ...updates }
    setStyle(newStyle)
    updateLayer(layer.id, { style: newStyle })

    if (backend && isVector) {
      const map = backend.getNativeMap() as maplibregl.Map | null
      if (map) {
        // Update fill
        if (updates.fillColor !== undefined && map.getLayer(`${layer.id}-fill`)) {
          map.setPaintProperty(`${layer.id}-fill`, 'fill-color', newStyle.fillColor || '#3b82f6')
        }
        if (updates.fillOpacity !== undefined && map.getLayer(`${layer.id}-fill`)) {
          map.setPaintProperty(`${layer.id}-fill`, 'fill-opacity', (newStyle.fillOpacity ?? 0.5) * layer.opacity)
        }
        // Update stroke
        if (updates.strokeColor !== undefined && map.getLayer(`${layer.id}-line`)) {
          map.setPaintProperty(`${layer.id}-line`, 'line-color', newStyle.strokeColor || '#2563eb')
        }
        if (updates.strokeWidth !== undefined && map.getLayer(`${layer.id}-line`)) {
          map.setPaintProperty(`${layer.id}-line`, 'line-width', newStyle.strokeWidth || 2)
        }
        if (updates.strokeOpacity !== undefined && map.getLayer(`${layer.id}-line`)) {
          map.setPaintProperty(`${layer.id}-line`, 'line-opacity', (newStyle.strokeOpacity ?? 1) * layer.opacity)
        }
        // Update points
        if ((updates.pointColor !== undefined || updates.fillColor !== undefined) && map.getLayer(`${layer.id}-point`)) {
          map.setPaintProperty(`${layer.id}-point`, 'circle-color', newStyle.pointColor || newStyle.fillColor || '#3b82f6')
        }
        if (updates.pointRadius !== undefined && map.getLayer(`${layer.id}-point`)) {
          map.setPaintProperty(`${layer.id}-point`, 'circle-radius', newStyle.pointRadius || 6)
        }
        if (updates.strokeColor !== undefined && map.getLayer(`${layer.id}-point`)) {
          map.setPaintProperty(`${layer.id}-point`, 'circle-stroke-color', newStyle.strokeColor || '#1d4ed8')
        }
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-slate-800 border border-slate-600 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-slate-100">Style: {layer.name}</h3>
          </div>
          <button onClick={() => setShowStyleEditor(false)} className="rounded p-1 hover:bg-slate-700">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {isVector && (
            <>
              {/* Fill Color */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Fill Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={style.fillColor || '#3b82f6'}
                    onChange={e => applyStyle({ fillColor: e.target.value })}
                    className="h-10 w-10 cursor-pointer rounded border border-slate-600 bg-transparent"
                  />
                  <input
                    type="text"
                    value={style.fillColor || '#3b82f6'}
                    onChange={e => applyStyle({ fillColor: e.target.value })}
                    className="h-10 w-24 rounded-lg border border-slate-600 bg-slate-700 px-3 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => applyStyle({ fillColor: color })}
                      className={`h-6 w-6 rounded-full border-2 transition-all ${
                        style.fillColor === color ? 'border-white scale-110' : 'border-slate-600 hover:border-slate-400'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Fill Opacity */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Fill Opacity: {Math.round((style.fillOpacity ?? 0.5) * 100)}%
                </label>
                <input
                  type="range"
                  min="0" max="1" step="0.05"
                  value={style.fillOpacity ?? 0.5}
                  onChange={e => applyStyle({ fillOpacity: parseFloat(e.target.value) })}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-600"
                />
              </div>

              {/* Stroke Color */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Stroke Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={style.strokeColor || '#2563eb'}
                    onChange={e => applyStyle({ strokeColor: e.target.value })}
                    className="h-10 w-10 cursor-pointer rounded border border-slate-600 bg-transparent"
                  />
                  <input
                    type="text"
                    value={style.strokeColor || '#2563eb'}
                    onChange={e => applyStyle({ strokeColor: e.target.value })}
                    className="h-10 w-24 rounded-lg border border-slate-600 bg-slate-700 px-3 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Stroke Width */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Stroke Width: {style.strokeWidth || 2}px
                </label>
                <input
                  type="range"
                  min="0" max="10" step="0.5"
                  value={style.strokeWidth || 2}
                  onChange={e => applyStyle({ strokeWidth: parseFloat(e.target.value) })}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-600"
                />
              </div>

              {/* Stroke Opacity */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Stroke Opacity: {Math.round((style.strokeOpacity ?? 1) * 100)}%
                </label>
                <input
                  type="range"
                  min="0" max="1" step="0.05"
                  value={style.strokeOpacity ?? 1}
                  onChange={e => applyStyle({ strokeOpacity: parseFloat(e.target.value) })}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-600"
                />
              </div>

              {/* Point Radius */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Point Radius: {style.pointRadius || 6}px
                </label>
                <input
                  type="range"
                  min="1" max="30" step="1"
                  value={style.pointRadius || 6}
                  onChange={e => applyStyle({ pointRadius: parseFloat(e.target.value) })}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-600"
                />
              </div>

              {/* Point Color */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Point Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={style.pointColor || style.fillColor || '#3b82f6'}
                    onChange={e => applyStyle({ pointColor: e.target.value })}
                    className="h-10 w-10 cursor-pointer rounded border border-slate-600 bg-transparent"
                  />
                  <input
                    type="text"
                    value={style.pointColor || style.fillColor || '#3b82f6'}
                    onChange={e => applyStyle({ pointColor: e.target.value })}
                    className="h-10 w-24 rounded-lg border border-slate-600 bg-slate-700 px-3 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {!isVector && (
            <div className="text-sm text-slate-400 text-center py-4">
              Style editor is currently available for vector (GeoJSON) layers only.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700">
          <button
            onClick={() => setShowStyleEditor(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
