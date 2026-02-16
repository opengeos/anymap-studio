import { Plus, Upload } from 'lucide-react'
import { LayerItem } from './LayerItem'
import { useProjectStore } from '../../stores/projectStore'
import { useMapStore } from '../../stores/mapStore'
import type { UnifiedLayerConfig } from '../../types/project'

export function LayerPanel() {
  const { layers, addLayer } = useProjectStore()
  const { backend } = useMapStore()

  const handleAddGeoJSON = async () => {
    const api = window.electronAPI
    if (!api) return

    const result = await api.showOpenDialog({
      filters: [
        { name: 'GeoJSON Files', extensions: ['geojson', 'json'] }
      ]
    })

    if (result.canceled || !result.content) return

    try {
      const data = JSON.parse(result.content) as GeoJSON.GeoJSON
      const fileName = result.filePath?.split('/').pop()?.replace(/\.(geojson|json)$/i, '') || 'Untitled'

      const layerConfig: UnifiedLayerConfig = {
        id: `layer-${Date.now()}`,
        name: fileName,
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

        // Calculate bounds and zoom to data
        const bounds = calculateBounds(data)
        if (bounds) {
          backend.fitBounds(bounds, 50)
        }
      }
    } catch (e) {
      console.error('Failed to parse GeoJSON:', e)
    }
  }

  const handleAddFromURL = () => {
    // TODO: Show URL input dialog
  }

  const reversedLayers = [...layers].reverse()

  return (
    <div className="flex flex-col px-3 py-2">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={handleAddGeoJSON}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
          title="Add GeoJSON file"
        >
          <Plus className="h-4 w-4" />
          Add File
        </button>
        <button
          onClick={handleAddFromURL}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
          title="Add from URL"
        >
          <Upload className="h-4 w-4" />
          From URL
        </button>
      </div>

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
