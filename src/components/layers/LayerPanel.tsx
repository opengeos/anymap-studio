import { Plus, Link } from 'lucide-react'
import shp from 'shpjs'
import { LayerItem } from './LayerItem'
import { useProjectStore } from '../../stores/projectStore'
import { useMapStore } from '../../stores/mapStore'
import type { UnifiedLayerConfig } from '../../types/project'
import { useState, useRef } from 'react'
import { parseKML, parseCSV, getCSVHeaders, autoDetectCoordinateColumns } from '../../utils/parsers'
import { calculateBounds } from '../../utils/geo'

export function LayerPanel() {
  const { layers, addLayer, reorderLayers } = useProjectStore()
  const { backend } = useMapStore()
  const [showUrlDialog, setShowUrlDialog] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlType, setUrlType] = useState<'geojson' | 'cog' | 'pmtiles' | 'xyz' | 'wms' | 'wmts'>('geojson')
  const [isLoading, setIsLoading] = useState(false)
  const [showCsvDialog, setShowCsvDialog] = useState(false)
  const [csvContent, setCsvContent] = useState('')
  const [csvFileName, setCsvFileName] = useState('')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvLatCol, setCsvLatCol] = useState('')
  const [csvLngCol, setCsvLngCol] = useState('')
  const [wmsLayers, setWmsLayers] = useState('')
  const dragItemRef = useRef<number | null>(null)
  const dragOverRef = useRef<number | null>(null)

  const addLayerWithData = async (data: GeoJSON.GeoJSON, name: string) => {
    const layerConfig: UnifiedLayerConfig = {
      id: `layer-${Date.now()}`,
      name,
      type: 'geojson',
      visible: true,
      opacity: 1,
      source: { type: 'geojson', data },
      style: {
        fillColor: getRandomColor(),
        fillOpacity: 0.5,
        strokeColor: '#1d4ed8',
        strokeWidth: 2,
        pointRadius: 6
      }
    }
    addLayer(layerConfig)
    if (backend) {
      await backend.addLayer(layerConfig)
      const bounds = calculateBounds(data)
      if (bounds) backend.fitBounds(bounds, 50)
    }
  }

  const handleAddFile = async () => {
    const api = window.electronAPI
    if (!api) return
    const result = await api.showOpenDialog({
      filters: [
        { name: 'Geospatial Files', extensions: ['geojson', 'json', 'shp', 'zip', 'kml', 'kmz', 'csv', 'tsv'] },
        { name: 'GeoJSON', extensions: ['geojson', 'json'] },
        { name: 'Shapefile', extensions: ['shp', 'zip'] },
        { name: 'KML/KMZ', extensions: ['kml', 'kmz'] },
        { name: 'CSV/TSV', extensions: ['csv', 'tsv'] }
      ]
    })
    if (result.canceled || !result.filePath) return
    const ext = result.filePath.split('.').pop()?.toLowerCase()
    const fileName = result.filePath.split('/').pop()?.split('\\').pop()?.replace(/\.\w+$/i, '') || 'Untitled'

    setIsLoading(true)
    try {
      if (ext === 'shp' || (ext === 'zip' && !result.filePath.toLowerCase().endsWith('.kmz'))) {
        if (!result.buffer) throw new Error('Failed to read binary file')
        const binaryString = atob(result.buffer)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i)
        const data = await shp(bytes.buffer) as GeoJSON.GeoJSON
        await addLayerWithData(data, fileName)
      } else if (ext === 'kml') {
        if (!result.content) throw new Error('Failed to read KML file')
        await addLayerWithData(parseKML(result.content), fileName)
      } else if (ext === 'kmz') {
        if (!result.buffer) throw new Error('Failed to read KMZ file')
        const binaryString = atob(result.buffer)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i)
        const kmlContent = extractKMLFromBuffer(bytes)
        if (!kmlContent) throw new Error('No KML file found in KMZ archive')
        await addLayerWithData(parseKML(kmlContent), fileName)
      } else if (ext === 'csv' || ext === 'tsv') {
        if (!result.content) throw new Error('Failed to read CSV file')
        const headers = getCSVHeaders(result.content)
        const detected = autoDetectCoordinateColumns(headers)
        if (detected.lat && detected.lng) {
          await addLayerWithData(parseCSV(result.content, { latColumn: detected.lat, lngColumn: detected.lng }), fileName)
        } else {
          setCsvContent(result.content); setCsvFileName(fileName)
          setCsvHeaders(headers); setCsvLatCol(detected.lat || ''); setCsvLngCol(detected.lng || '')
          setShowCsvDialog(true)
        }
      } else {
        if (!result.content) return
        await addLayerWithData(JSON.parse(result.content) as GeoJSON.GeoJSON, fileName)
      }
    } catch (e) {
      console.error('Failed to load file:', e)
      alert(`Failed to load file: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCsvConfirm = async () => {
    if (!csvLatCol || !csvLngCol) { alert('Please select both latitude and longitude columns'); return }
    setIsLoading(true)
    try {
      await addLayerWithData(parseCSV(csvContent, { latColumn: csvLatCol, lngColumn: csvLngCol }), csvFileName)
      setShowCsvDialog(false)
    } catch (e) {
      alert(`Failed to parse CSV: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally { setIsLoading(false) }
  }

  const handleAddFromURL = async () => {
    if (!urlInput.trim()) return
    setIsLoading(true)
    try {
      const url = urlInput.trim()
      const name = url.split('/').pop()?.split('?')[0] || 'URL Layer'

      if (urlType === 'geojson') {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        await addLayerWithData(await response.json() as GeoJSON.GeoJSON, name.replace(/\.(geojson|json)$/i, ''))
      } else if (urlType === 'cog' || urlType === 'xyz') {
        const cfg: UnifiedLayerConfig = {
          id: `layer-${Date.now()}`, name: name.replace(/\.(tif|tiff)$/i, ''),
          type: urlType === 'cog' ? 'cog' : 'raster', visible: true, opacity: 1,
          source: { type: 'raster', url, tiles: urlType === 'xyz' ? [url] : undefined }
        }
        addLayer(cfg); if (backend) await backend.addLayer(cfg)
      } else if (urlType === 'pmtiles') {
        const cfg: UnifiedLayerConfig = {
          id: `layer-${Date.now()}`, name: name.replace(/\.pmtiles$/i, ''),
          type: 'pmtiles', visible: true, opacity: 1,
          source: { type: 'vector', url }
        }
        addLayer(cfg); if (backend) await backend.addLayer(cfg)
      } else if (urlType === 'wms') {
        const layerNames = wmsLayers.trim() || '0'
        const tileUrl = `${url}${url.includes('?') ? '&' : '?'}SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=${layerNames}&SRS=EPSG:3857&STYLES=&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}`
        const cfg: UnifiedLayerConfig = {
          id: `layer-${Date.now()}`, name: `WMS: ${layerNames}`,
          type: 'raster', visible: true, opacity: 1,
          source: { type: 'raster', tiles: [tileUrl], attribution: url }
        }
        addLayer(cfg); if (backend) await backend.addLayer(cfg)
      } else if (urlType === 'wmts') {
        const layerNames = wmsLayers.trim() || '0'
        const cfg: UnifiedLayerConfig = {
          id: `layer-${Date.now()}`, name: `WMTS: ${layerNames}`,
          type: 'raster', visible: true, opacity: 1,
          source: { type: 'raster', url, tiles: [url] }
        }
        addLayer(cfg); if (backend) await backend.addLayer(cfg)
      }
      setShowUrlDialog(false); setUrlInput(''); setWmsLayers('')
    } catch (e) {
      console.error('Failed to load from URL:', e)
      alert(`Failed to load from URL: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally { setIsLoading(false) }
  }

  const handleDragStart = (index: number) => { dragItemRef.current = index }
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); dragOverRef.current = index }
  const handleDragEnd = () => {
    if (dragItemRef.current !== null && dragOverRef.current !== null && dragItemRef.current !== dragOverRef.current) {
      const total = layers.length
      reorderLayers(total - 1 - dragItemRef.current, total - 1 - dragOverRef.current)
    }
    dragItemRef.current = null; dragOverRef.current = null
  }

  const reversedLayers = [...layers].reverse()

  return (
    <div className="flex flex-col px-4 py-3">
      {/* Add buttons */}
      <div className="flex items-center gap-2.5 mb-4">
        <button
          onClick={handleAddFile}
          disabled={isLoading}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-700/80 px-3 py-2 text-[13px] font-medium text-slate-200 hover:bg-slate-600 transition-colors disabled:opacity-50"
          title="Add file (GeoJSON, Shapefile, KML, CSV)"
        >
          <Plus className="h-4 w-4" />
          {isLoading ? 'Loading...' : 'Add File'}
        </button>
        <button
          onClick={() => setShowUrlDialog(true)}
          disabled={isLoading}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-700/80 px-3 py-2 text-[13px] font-medium text-slate-200 hover:bg-slate-600 transition-colors disabled:opacity-50"
          title="Add from URL"
        >
          <Link className="h-4 w-4" />
          From URL
        </button>
      </div>

      {/* URL Dialog */}
      {showUrlDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowUrlDialog(false); setUrlInput(''); setWmsLayers('') }}>
          <div className="w-full max-w-lg rounded-2xl bg-slate-800 shadow-2xl border border-slate-600" onClick={e => e.stopPropagation()}>
            <div className="px-7 pt-7 pb-5">
              <h3 className="text-lg font-semibold text-slate-100">Add Layer from URL</h3>
            </div>

            <div className="px-7 pb-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Layer Type</label>
                <select
                  value={urlType}
                  onChange={(e) => setUrlType(e.target.value as typeof urlType)}
                  className="w-full rounded-lg border border-slate-500 bg-slate-700 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="geojson">GeoJSON</option>
                  <option value="cog">Cloud Optimized GeoTIFF (COG)</option>
                  <option value="pmtiles">PMTiles</option>
                  <option value="xyz">XYZ Tiles</option>
                  <option value="wms">WMS Service</option>
                  <option value="wmts">WMTS Service</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">URL</label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder={
                    urlType === 'geojson' ? 'https://example.com/data.geojson' :
                    urlType === 'cog' ? 'https://example.com/image.tif' :
                    urlType === 'pmtiles' ? 'https://example.com/tiles.pmtiles' :
                    urlType === 'wms' ? 'https://example.com/wms' :
                    urlType === 'wmts' ? 'https://example.com/wmts' :
                    'https://example.com/tiles/{z}/{x}/{y}.png'
                  }
                  className="w-full rounded-lg border border-slate-500 bg-slate-700 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {(urlType === 'wms' || urlType === 'wmts') && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Layer Name(s)</label>
                  <input
                    type="text"
                    value={wmsLayers}
                    onChange={(e) => setWmsLayers(e.target.value)}
                    placeholder="layer1,layer2"
                    className="w-full rounded-lg border border-slate-500 bg-slate-700 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">Comma-separated WMS layer names</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-7 py-5 border-t border-slate-700">
              <button
                onClick={() => { setShowUrlDialog(false); setUrlInput(''); setWmsLayers('') }}
                className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFromURL}
                disabled={!urlInput.trim() || isLoading}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Loading...' : 'Add Layer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Column Selection Dialog */}
      {showCsvDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCsvDialog(false)}>
          <div className="w-full max-w-md rounded-2xl bg-slate-800 shadow-2xl border border-slate-600" onClick={e => e.stopPropagation()}>
            <div className="px-7 pt-7 pb-4">
              <h3 className="text-lg font-semibold text-slate-100">Select Coordinate Columns</h3>
              <p className="mt-2 text-sm text-slate-400">
                Could not auto-detect coordinate columns. Please select the latitude and longitude columns.
              </p>
            </div>

            <div className="px-7 pb-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Latitude Column</label>
                <select value={csvLatCol} onChange={e => setCsvLatCol(e.target.value)}
                  className="w-full rounded-lg border border-slate-500 bg-slate-700 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none">
                  <option value="">— Select —</option>
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Longitude Column</label>
                <select value={csvLngCol} onChange={e => setCsvLngCol(e.target.value)}
                  className="w-full rounded-lg border border-slate-500 bg-slate-700 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none">
                  <option value="">— Select —</option>
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-7 py-5 border-t border-slate-700">
              <button onClick={() => setShowCsvDialog(false)}
                className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700">Cancel</button>
              <button onClick={handleCsvConfirm} disabled={!csvLatCol || !csvLngCol || isLoading}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
                {isLoading ? 'Loading...' : 'Load CSV'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Layer list */}
      {layers.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500">
          No layers yet. Add a file or URL to get started.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {reversedLayers.map((layer, displayIndex) => (
            <LayerItem
              key={layer.id}
              layer={layer}
              index={displayIndex}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function extractKMLFromBuffer(data: Uint8Array): string | null {
  let offset = 0
  const decoder = new TextDecoder()
  while (offset < data.length - 4) {
    if (data[offset] === 0x50 && data[offset + 1] === 0x4b && data[offset + 2] === 0x03 && data[offset + 3] === 0x04) {
      const compressionMethod = data[offset + 8] | (data[offset + 9] << 8)
      const compressedSize = data[offset + 18] | (data[offset + 19] << 8) | (data[offset + 20] << 16) | (data[offset + 21] << 24)
      const fileNameLength = data[offset + 26] | (data[offset + 27] << 8)
      const extraFieldLength = data[offset + 28] | (data[offset + 29] << 8)
      const fileName = decoder.decode(data.slice(offset + 30, offset + 30 + fileNameLength))
      const dataStart = offset + 30 + fileNameLength + extraFieldLength
      if (fileName.toLowerCase().endsWith('.kml') && compressionMethod === 0) {
        return decoder.decode(data.slice(dataStart, dataStart + compressedSize))
      }
      offset = dataStart + compressedSize
    } else { offset++ }
  }
  return null
}

function getRandomColor(): string {
  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']
  return colors[Math.floor(Math.random() * colors.length)]
}
