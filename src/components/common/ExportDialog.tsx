import { useState } from 'react'
import { X, Download, Image, FileJson, FileSpreadsheet } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { useMapStore } from '../../stores/mapStore'
import { exportMapToPNG, exportToGeoJSON, exportToCSV, downloadBlob } from '../../utils/export'

export function ExportDialog() {
  const { showExportDialog, setShowExportDialog } = useUIStore()
  const { layers } = useProjectStore()
  const { backend } = useMapStore()
  const [isExporting, setIsExporting] = useState(false)

  if (!showExportDialog) return null

  const vectorLayers = layers.filter(l => l.type === 'geojson' && l.source.data)

  const handleExportPNG = async () => {
    const map = backend?.getNativeMap() as maplibregl.Map | null
    if (!map) return

    setIsExporting(true)
    try {
      const blob = await exportMapToPNG(map)
      downloadBlob(blob, 'map-export.png')
    } catch (e) {
      console.error('Failed to export PNG:', e)
      alert('Failed to export map to PNG')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportGeoJSON = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId)
    if (!layer || !layer.source.data) return

    exportToGeoJSON(layer.source.data as GeoJSON.GeoJSON, layer.name)
  }

  const handleExportCSV = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId)
    if (!layer || !layer.source.data) return

    const geojson = layer.source.data as GeoJSON.GeoJSON
    if (geojson.type === 'FeatureCollection') {
      exportToCSV(geojson.features, layer.name)
    } else if (geojson.type === 'Feature') {
      exportToCSV([geojson], layer.name)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowExportDialog(false)}>
      <div className="w-full max-w-lg rounded-2xl bg-slate-800 border border-slate-600 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-slate-100">Export</h3>
          </div>
          <button onClick={() => setShowExportDialog(false)} className="rounded p-1 hover:bg-slate-700">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Map Export */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-200">Map</h4>
            <button
              onClick={handleExportPNG}
              disabled={isExporting || !backend}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-600 p-3 text-left hover:bg-slate-700/50 transition-colors disabled:opacity-50"
            >
              <Image className="h-8 w-8 text-green-400 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-slate-200">Export as PNG</div>
                <div className="text-xs text-slate-400">Save current map view as an image</div>
              </div>
            </button>
          </div>

          {/* Layer Export */}
          {vectorLayers.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-200">Layers</h4>
              <div className="space-y-2">
                {vectorLayers.map(layer => (
                  <div key={layer.id} className="rounded-lg border border-slate-600 p-3">
                    <div className="text-sm font-medium text-slate-200 mb-2">{layer.name}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExportGeoJSON(layer.id)}
                        className="flex items-center gap-1.5 rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600"
                      >
                        <FileJson className="h-3.5 w-3.5 text-blue-400" />
                        GeoJSON
                      </button>
                      <button
                        onClick={() => handleExportCSV(layer.id)}
                        className="flex items-center gap-1.5 rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-green-400" />
                        CSV
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {vectorLayers.length === 0 && (
            <div className="text-sm text-slate-400 text-center py-2">
              No vector layers available for export.
            </div>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-slate-700">
          <button
            onClick={() => setShowExportDialog(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
