import { useEffect, useRef, useState } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { useMapStore } from '../../stores/mapStore'
import { useProjectStore } from '../../stores/projectStore'
import maplibregl from 'maplibre-gl'
import type { MapLibreAdapter } from '../../backends/adapters/MapLibreAdapter'
import type { UnifiedLayerConfig } from '../../types/project'

interface DrawPoint {
  lng: number
  lat: number
}

function getRandomColor(): string {
  const colors = ['#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
  return colors[Math.floor(Math.random() * colors.length)]
}

export function DrawTool() {
  const { activeTool, setActiveTool } = useUIStore()
  const { backend, backendType } = useMapStore()
  const { addLayer } = useProjectStore()
  const [points, setPoints] = useState<DrawPoint[]>([])
  const markersRef = useRef<maplibregl.Marker[]>([])
  const sourceAddedRef = useRef(false)

  const isActive =
    activeTool === 'draw-point' ||
    activeTool === 'draw-line' ||
    activeTool === 'draw-polygon'

  const cleanup = () => {
    if (backendType !== 'maplibre' || !backend) return

    const map = (backend as MapLibreAdapter).getNativeMap()
    if (!map) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    if (map.getLayer('draw-line')) map.removeLayer('draw-line')
    if (map.getLayer('draw-fill')) map.removeLayer('draw-fill')
    if (map.getSource('draw')) map.removeSource('draw')
    sourceAddedRef.current = false

    setPoints([])
  }

  const saveDrawing = async () => {
    if (backendType !== 'maplibre' || !backend) return
    if (points.length === 0) return

    const color = getRandomColor()
    let geometry: GeoJSON.Geometry
    let layerName: string

    if (activeTool === 'draw-point') {
      if (points.length === 1) {
        geometry = { type: 'Point', coordinates: [points[0].lng, points[0].lat] }
      } else {
        geometry = {
          type: 'MultiPoint',
          coordinates: points.map((p) => [p.lng, p.lat])
        }
      }
      layerName = 'Drawn Points'
    } else if (activeTool === 'draw-line') {
      geometry = {
        type: 'LineString',
        coordinates: points.map((p) => [p.lng, p.lat])
      }
      layerName = 'Drawn Line'
    } else {
      // Polygon - close the ring
      const coords = points.map((p) => [p.lng, p.lat])
      coords.push([points[0].lng, points[0].lat])
      geometry = {
        type: 'Polygon',
        coordinates: [coords]
      }
      layerName = 'Drawn Polygon'
    }

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { created: new Date().toISOString() },
          geometry
        }
      ]
    }

    const layerConfig: UnifiedLayerConfig = {
      id: `drawn-${Date.now()}`,
      name: layerName,
      type: 'geojson',
      visible: true,
      opacity: 1,
      source: {
        type: 'geojson',
        data: geojson
      },
      style: {
        fillColor: color,
        fillOpacity: 0.5,
        strokeColor: color,
        strokeWidth: 2,
        pointRadius: 6
      }
    }

    addLayer(layerConfig)
    await backend.addLayer(layerConfig)

    cleanup()
    setActiveTool('none')
  }

  useEffect(() => {
    if (!isActive || backendType !== 'maplibre' || !backend) return

    const map = (backend as MapLibreAdapter).getNativeMap()
    if (!map) return

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const newPoint: DrawPoint = { lng: e.lngLat.lng, lat: e.lngLat.lat }

      setPoints((prev) => {
        const updated = [...prev, newPoint]

        // Add marker
        const marker = new maplibregl.Marker({ color: '#22c55e' })
          .setLngLat([newPoint.lng, newPoint.lat])
          .addTo(map)
        markersRef.current.push(marker)

        // Update geometry on map
        updateMapGeometry(map, updated)

        return updated
      })
    }

    const handleDoubleClick = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault()
      // Double-click finishes drawing for lines and polygons
      if (activeTool !== 'draw-point') {
        saveDrawing()
      }
    }

    map.on('click', handleClick)
    map.on('dblclick', handleDoubleClick)
    map.getCanvas().style.cursor = 'crosshair'

    return () => {
      map.off('click', handleClick)
      map.off('dblclick', handleDoubleClick)
      map.getCanvas().style.cursor = ''
    }
  }, [isActive, backend, backendType, activeTool])

  useEffect(() => {
    if (!isActive) {
      cleanup()
    }
  }, [isActive])

  const updateMapGeometry = (map: maplibregl.Map, drawPoints: DrawPoint[]) => {
    if (drawPoints.length < 2) return

    const coordinates = drawPoints.map((p) => [p.lng, p.lat])

    let geometry: GeoJSON.Geometry
    if (activeTool === 'draw-polygon' && drawPoints.length >= 3) {
      geometry = {
        type: 'Polygon',
        coordinates: [[...coordinates, coordinates[0]]]
      }
    } else {
      geometry = { type: 'LineString', coordinates }
    }

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry }]
    }

    if (!sourceAddedRef.current) {
      map.addSource('draw', { type: 'geojson', data: geojson })

      if (activeTool === 'draw-polygon') {
        map.addLayer({
          id: 'draw-fill',
          type: 'fill',
          source: 'draw',
          paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.2 }
        })
      }

      map.addLayer({
        id: 'draw-line',
        type: 'line',
        source: 'draw',
        paint: { 'line-color': '#22c55e', 'line-width': 2 }
      })

      sourceAddedRef.current = true
    } else {
      const source = map.getSource('draw') as maplibregl.GeoJSONSource
      source.setData(geojson)
    }
  }

  if (!isActive) return null

  return (
    <div className="absolute bottom-16 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-3 shadow-lg">
      <div className="flex items-center gap-4">
        <div className="text-sm text-slate-300">
          <span className="font-medium">
            {activeTool === 'draw-point' && 'Drawing Points'}
            {activeTool === 'draw-line' && 'Drawing Line'}
            {activeTool === 'draw-polygon' && 'Drawing Polygon'}
          </span>
          <span className="ml-2 text-slate-500">
            {points.length} point{points.length !== 1 ? 's' : ''}
            {activeTool !== 'draw-point' && ' (double-click to finish)'}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={saveDrawing}
            disabled={
              (activeTool === 'draw-point' && points.length < 1) ||
              (activeTool === 'draw-line' && points.length < 2) ||
              (activeTool === 'draw-polygon' && points.length < 3)
            }
            className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-500 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => {
              cleanup()
              setActiveTool('none')
            }}
            className="rounded bg-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
