import { Plus, Link } from 'lucide-react'
import shp from 'shpjs'
import { LayerItem } from './LayerItem'
import { useProjectStore } from '../../stores/projectStore'
import { useMapStore } from '../../stores/mapStore'
import type { UnifiedLayerConfig } from '../../types/project'
import { useState } from 'react'

export function LayerPanel() {
  const { layers, addLayer } = useProjectStore()
  const { backend } = useMapStore()
  const [showUrlDialog, setShowUrlDialog] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlType, setUrlType] = useState<'geojson' | 'cog' | 'pmtiles' | 'xyz'>('geojson')
  const [isLoading, setIsLoading] = useState(false)

  const addLayerWithData = async (data: GeoJSON.GeoJSON, name: string) => {
    const layerConfig: UnifiedLayerConfig = {
      id: `layer-${Date.now()}`,
      name,
      type: 'geojson',
      visible: true,
      opacity: 1,
      source: {
        type: 'geojson',
        data
      },
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
      if (bounds) {
        backend.fitBounds(bounds, 50)
      }
    }
  }

  const handleAddFile = async () => {
    const api = window.electronAPI
    if (!api) return

    const result = await api.showOpenDialog({
      filters: [
        { name: 'Geospatial Files', extensions: ['geojson', 'json', 'shp', 'zip'] },
        { name: 'GeoJSON', extensions: ['geojson', 'json'] },
        { name: 'Shapefile', extensions: ['shp', 'zip'] }
      ]
    })

    if (result.canceled || !result.filePath) return

    const ext = result.filePath.split('.').pop()?.toLowerCase()
    const fileName = result.filePath.split('/').pop()?.replace(/\.(geojson|json|shp|zip)$/i, '') || 'Untitled'

    setIsLoading(true)
    try {
      if (ext === 'shp' || ext === 'zip') {
        // Parse Shapefile using shpjs - result.buffer is base64 encoded
        if (!result.buffer) {
          throw new Error('Failed to read binary file')
        }
        // Convert base64 to ArrayBuffer
        const binaryString = atob(result.buffer)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const data = await shp(bytes.buffer) as GeoJSON.GeoJSON
        await addLayerWithData(data, fileName)
      } else {
        // Parse GeoJSON
        if (!result.content) return
        const data = JSON.parse(result.content) as GeoJSON.GeoJSON
        await addLayerWithData(data, fileName)
      }
    } catch (e) {
      console.error('Failed to load file:', e)
      alert(`Failed to load file: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
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
        const data = await response.json() as GeoJSON.GeoJSON
        await addLayerWithData(data, name.replace(/\.(geojson|json)$/i, ''))
      } else if (urlType === 'cog' || urlType === 'xyz') {
        const layerConfig: UnifiedLayerConfig = {
          id: `layer-${Date.now()}`,
          name: name.replace(/\.(tif|tiff)$/i, ''),
          type: urlType === 'cog' ? 'cog' : 'raster',
          visible: true,
          opacity: 1,
          source: {
            type: 'raster',
            url: url,
            tiles: urlType === 'xyz' ? [url] : undefined
          }
        }
        addLayer(layerConfig)
        if (backend) {
          await backend.addLayer(layerConfig)
        }
      } else if (urlType === 'pmtiles') {
        const layerConfig: UnifiedLayerConfig = {
          id: `layer-${Date.now()}`,
          name: name.replace(/\.pmtiles$/i, ''),
          type: 'pmtiles',
          visible: true,
          opacity: 1,
          source: {
            type: 'vector',
            url: url
          }
        }
        addLayer(layerConfig)
        if (backend) {
          await backend.addLayer(layerConfig)
        }
      }

      setShowUrlDialog(false)
      setUrlInput('')
    } catch (e) {
      console.error('Failed to load from URL:', e)
      alert(`Failed to load from URL: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const reversedLayers = [...layers].reverse()

  return (
    <div className="flex flex-col px-3 py-2">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={handleAddFile}
          disabled={isLoading}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors disabled:opacity-50"
          title="Add file (GeoJSON, Shapefile)"
        >
          <Plus className="h-4 w-4" />
          {isLoading ? 'Loading...' : 'Add File'}
        </button>
        <button
          onClick={() => setShowUrlDialog(true)}
          disabled={isLoading}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors disabled:opacity-50"
          title="Add from URL"
        >
          <Link className="h-4 w-4" />
          From URL
        </button>
      </div>

      {/* URL Dialog */}
      {showUrlDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-slate-800 p-6 shadow-2xl border border-slate-700">
            <h3 className="mb-6 text-lg font-semibold text-slate-100">Add Layer from URL</h3>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-slate-300">Layer Type</label>
              <select
                value={urlType}
                onChange={(e) => setUrlType(e.target.value as typeof urlType)}
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="geojson">GeoJSON</option>
                <option value="cog">Cloud Optimized GeoTIFF (COG)</option>
                <option value="pmtiles">PMTiles</option>
                <option value="xyz">XYZ Tiles</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-slate-300">URL</label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={
                  urlType === 'geojson' ? 'https://example.com/data.geojson' :
                  urlType === 'cog' ? 'https://example.com/image.tif' :
                  urlType === 'pmtiles' ? 'https://example.com/tiles.pmtiles' :
                  'https://example.com/tiles/{z}/{x}/{y}.png'
                }
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowUrlDialog(false)
                  setUrlInput('')
                }}
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

      {layers.length === 0 ? (
        <div className="py-6 text-center text-sm text-slate-400">
          No layers yet. Add a file or URL to get started.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {reversedLayers.map((layer) => (
            <LayerItem
              key={layer.id}
              layer={layer}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function getRandomColor(): string {
  const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#22c55e', // green
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316'  // orange
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

function calculateBounds(geojson: GeoJSON.GeoJSON): [[number, number], [number, number]] | null {
  const coords: [number, number][] = []

  function extractCoords(geometry: GeoJSON.Geometry) {
    switch (geometry.type) {
      case 'Point':
        coords.push(geometry.coordinates as [number, number])
        break
      case 'MultiPoint':
      case 'LineString':
        (geometry.coordinates as [number, number][]).forEach(c => coords.push(c))
        break
      case 'MultiLineString':
      case 'Polygon':
        (geometry.coordinates as [number, number][][]).forEach(ring =>
          ring.forEach(c => coords.push(c))
        )
        break
      case 'MultiPolygon':
        (geometry.coordinates as [number, number][][][]).forEach(polygon =>
          polygon.forEach(ring => ring.forEach(c => coords.push(c)))
        )
        break
      case 'GeometryCollection':
        geometry.geometries.forEach(g => extractCoords(g))
        break
    }
  }

  if (geojson.type === 'Feature') {
    if (geojson.geometry) extractCoords(geojson.geometry)
  } else if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach(f => {
      if (f.geometry) extractCoords(f.geometry)
    })
  } else {
    extractCoords(geojson as GeoJSON.Geometry)
  }

  if (coords.length === 0) return null

  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity

  coords.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  })

  return [[minLng, minLat], [maxLng, maxLat]]
}
