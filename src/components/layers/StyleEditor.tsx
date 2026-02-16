import { useState, useEffect, useMemo } from 'react'
import { X, Palette, Download, Upload } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { useMapStore } from '../../stores/mapStore'
import type { LayerStyle, LabelConfig } from '../../types/project'
import { getPropertyKeys } from '../../utils/geo'
import { downloadString } from '../../utils/export'
import maplibregl from 'maplibre-gl'

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

  const propertyKeys = useMemo(() => {
    if (!layer || layer.type !== 'geojson' || !layer.source.data) return []
    return getPropertyKeys(layer.source.data as GeoJSON.GeoJSON)
  }, [layer?.id, layer?.source.data])

  useEffect(() => {
    if (layer?.style) setStyle({ ...layer.style })
  }, [layer?.id, layer?.style])

  if (!showStyleEditor || !styleEditorLayerId || !layer) return null

  const isVector = layer.type === 'geojson'

  const applyStyle = (updates: Partial<LayerStyle>) => {
    const newStyle = { ...style, ...updates }
    setStyle(newStyle)
    updateLayer(layer.id, { style: newStyle })

    if (backend && isVector) {
      const map = backend.getNativeMap() as maplibregl.Map | null
      if (!map) return

      if (updates.fillColor !== undefined && map.getLayer(`${layer.id}-fill`))
        map.setPaintProperty(`${layer.id}-fill`, 'fill-color', newStyle.fillColor || '#3b82f6')
      if (updates.fillOpacity !== undefined && map.getLayer(`${layer.id}-fill`))
        map.setPaintProperty(`${layer.id}-fill`, 'fill-opacity', (newStyle.fillOpacity ?? 0.5) * layer.opacity)
      if (updates.strokeColor !== undefined && map.getLayer(`${layer.id}-line`))
        map.setPaintProperty(`${layer.id}-line`, 'line-color', newStyle.strokeColor || '#2563eb')
      if (updates.strokeWidth !== undefined && map.getLayer(`${layer.id}-line`))
        map.setPaintProperty(`${layer.id}-line`, 'line-width', newStyle.strokeWidth || 2)
      if (updates.strokeOpacity !== undefined && map.getLayer(`${layer.id}-line`))
        map.setPaintProperty(`${layer.id}-line`, 'line-opacity', (newStyle.strokeOpacity ?? 1) * layer.opacity)
      if ((updates.pointColor !== undefined || updates.fillColor !== undefined) && map.getLayer(`${layer.id}-point`))
        map.setPaintProperty(`${layer.id}-point`, 'circle-color', newStyle.pointColor || newStyle.fillColor || '#3b82f6')
      if (updates.pointRadius !== undefined && map.getLayer(`${layer.id}-point`))
        map.setPaintProperty(`${layer.id}-point`, 'circle-radius', newStyle.pointRadius || 6)
      if (updates.strokeColor !== undefined && map.getLayer(`${layer.id}-point`))
        map.setPaintProperty(`${layer.id}-point`, 'circle-stroke-color', newStyle.strokeColor || '#1d4ed8')

      // Apply label changes
      if (updates.label !== undefined) applyLabelToMap(map, newStyle.label)
    }
  }

  const applyLabelToMap = (map: maplibregl.Map, label?: LabelConfig) => {
    const labelLayerId = `${layer.id}-label`
    const sourceId = `${layer.id}-source`

    if (!label?.enabled || !label?.field) {
      if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId)
      return
    }

    if (map.getLayer(labelLayerId)) {
      map.setLayoutProperty(labelLayerId, 'text-field', ['get', label.field])
      map.setLayoutProperty(labelLayerId, 'text-size', label.fontSize || 12)
      map.setPaintProperty(labelLayerId, 'text-color', label.color || '#ffffff')
      map.setPaintProperty(labelLayerId, 'text-halo-color', label.haloColor || '#000000')
      map.setPaintProperty(labelLayerId, 'text-halo-width', label.haloWidth || 1)
    } else if (map.getSource(sourceId)) {
      map.addLayer({
        id: labelLayerId,
        type: 'symbol',
        source: sourceId,
        layout: {
          'text-field': ['get', label.field],
          'text-size': label.fontSize || 12,
          'text-anchor': 'top',
          'text-offset': [0, 0.8],
          'text-allow-overlap': false,
          'text-optional': true
        },
        paint: {
          'text-color': label.color || '#ffffff',
          'text-halo-color': label.haloColor || '#000000',
          'text-halo-width': label.haloWidth || 1
        }
      })
    }
  }

  const handleExportStyle = () => {
    downloadString(JSON.stringify(style, null, 2), `${layer.name}-style.json`, 'application/json')
  }

  const handleImportStyle = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const imported = JSON.parse(text) as LayerStyle
        applyStyle(imported)
      } catch (err) {
        alert('Failed to import style: invalid JSON')
      }
    }
    input.click()
  }

  const labelConfig = style.label || { enabled: false, field: '', fontSize: 12, color: '#ffffff', haloColor: '#000000', haloWidth: 1 }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowStyleEditor(false)}>
      <div className="w-full max-w-md rounded-2xl bg-slate-800 border border-slate-600 shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <Palette className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-slate-100">{layer.name}</h3>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleImportStyle} className="rounded-md p-1.5 hover:bg-slate-700 transition-colors" title="Import style">
              <Upload className="h-4 w-4 text-slate-400" />
            </button>
            <button onClick={handleExportStyle} className="rounded-md p-1.5 hover:bg-slate-700 transition-colors" title="Export style">
              <Download className="h-4 w-4 text-slate-400" />
            </button>
            <button onClick={() => setShowStyleEditor(false)} className="rounded-md p-1.5 hover:bg-slate-700 transition-colors">
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {isVector && (
            <>
              {/* Fill Color */}
              <StyleSection title="Fill Color">
                <div className="flex items-center gap-3">
                  <input type="color" value={style.fillColor || '#3b82f6'} onChange={e => applyStyle({ fillColor: e.target.value })}
                    className="h-9 w-9 cursor-pointer rounded border border-slate-600 bg-transparent" />
                  <input type="text" value={style.fillColor || '#3b82f6'} onChange={e => applyStyle({ fillColor: e.target.value })}
                    className="h-9 w-24 rounded-lg border border-slate-600 bg-slate-700 px-3 text-sm text-slate-200 focus:border-blue-500 focus:outline-none" />
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => applyStyle({ fillColor: c })}
                      className={`h-5.5 w-5.5 rounded-full border-2 transition-all ${style.fillColor === c ? 'border-white scale-110' : 'border-slate-600 hover:border-slate-400'}`}
                      style={{ backgroundColor: c, width: 22, height: 22 }} />
                  ))}
                </div>
              </StyleSection>

              {/* Fill Opacity */}
              <StyleSection title={`Fill Opacity: ${Math.round((style.fillOpacity ?? 0.5) * 100)}%`}>
                <input type="range" min="0" max="1" step="0.05" value={style.fillOpacity ?? 0.5}
                  onChange={e => applyStyle({ fillOpacity: parseFloat(e.target.value) })}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-600" />
              </StyleSection>

              {/* Stroke Color */}
              <StyleSection title="Stroke Color">
                <div className="flex items-center gap-3">
                  <input type="color" value={style.strokeColor || '#2563eb'} onChange={e => applyStyle({ strokeColor: e.target.value })}
                    className="h-9 w-9 cursor-pointer rounded border border-slate-600 bg-transparent" />
                  <input type="text" value={style.strokeColor || '#2563eb'} onChange={e => applyStyle({ strokeColor: e.target.value })}
                    className="h-9 w-24 rounded-lg border border-slate-600 bg-slate-700 px-3 text-sm text-slate-200 focus:border-blue-500 focus:outline-none" />
                </div>
              </StyleSection>

              {/* Stroke Width */}
              <StyleSection title={`Stroke Width: ${style.strokeWidth || 2}px`}>
                <input type="range" min="0" max="10" step="0.5" value={style.strokeWidth || 2}
                  onChange={e => applyStyle({ strokeWidth: parseFloat(e.target.value) })}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-600" />
              </StyleSection>

              {/* Point Radius */}
              <StyleSection title={`Point Radius: ${style.pointRadius || 6}px`}>
                <input type="range" min="1" max="30" step="1" value={style.pointRadius || 6}
                  onChange={e => applyStyle({ pointRadius: parseFloat(e.target.value) })}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-600" />
              </StyleSection>

              {/* Labels */}
              <div className="border-t border-slate-700 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-300">Labels</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={labelConfig.enabled}
                      onChange={e => applyStyle({ label: { ...labelConfig, enabled: e.target.checked } })}
                      className="sr-only peer" />
                    <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>

                {labelConfig.enabled && (
                  <div className="space-y-3 pl-0">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">Field</label>
                      <select value={labelConfig.field}
                        onChange={e => applyStyle({ label: { ...labelConfig, field: e.target.value } })}
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none">
                        <option value="">— Select field —</option>
                        {propertyKeys.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="mb-1.5 block text-xs font-medium text-slate-400">Font Size: {labelConfig.fontSize || 12}px</label>
                        <input type="range" min="6" max="32" step="1" value={labelConfig.fontSize || 12}
                          onChange={e => applyStyle({ label: { ...labelConfig, fontSize: parseInt(e.target.value) } })}
                          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-600" />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-400">Color</label>
                        <input type="color" value={labelConfig.color || '#ffffff'}
                          onChange={e => applyStyle({ label: { ...labelConfig, color: e.target.value } })}
                          className="h-8 w-8 cursor-pointer rounded border border-slate-600 bg-transparent" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-400">Halo</label>
                        <input type="color" value={labelConfig.haloColor || '#000000'}
                          onChange={e => applyStyle({ label: { ...labelConfig, haloColor: e.target.value } })}
                          className="h-8 w-8 cursor-pointer rounded border border-slate-600 bg-transparent" />
                      </div>
                      <div className="flex-1">
                        <label className="mb-1.5 block text-xs font-medium text-slate-400">Halo Width: {labelConfig.haloWidth || 1}px</label>
                        <input type="range" min="0" max="5" step="0.5" value={labelConfig.haloWidth || 1}
                          onChange={e => applyStyle({ label: { ...labelConfig, haloWidth: parseFloat(e.target.value) } })}
                          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-600" />
                      </div>
                    </div>
                  </div>
                )}
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
          <button onClick={() => setShowStyleEditor(false)}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function StyleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">{title}</label>
      {children}
    </div>
  )
}
