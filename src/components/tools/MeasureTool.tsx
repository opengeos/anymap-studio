import { useEffect, useRef, useState } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { useMapStore } from '../../stores/mapStore'
import maplibregl from 'maplibre-gl'
import type { MapLibreAdapter } from '../../backends/adapters/MapLibreAdapter'

interface MeasurePoint {
  lng: number
  lat: number
}

/**
 * Calculate distance between two points using Haversine formula.
 */
function haversineDistance(p1: MeasurePoint, p2: MeasurePoint): number {
  const R = 6371000 // Earth radius in meters
  const lat1 = (p1.lat * Math.PI) / 180
  const lat2 = (p2.lat * Math.PI) / 180
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Calculate polygon area using spherical excess formula.
 */
function calculateArea(points: MeasurePoint[]): number {
  if (points.length < 3) return 0

  const R = 6371000 // Earth radius in meters
  let total = 0

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]

    const lat1 = (p1.lat * Math.PI) / 180
    const lat2 = (p2.lat * Math.PI) / 180
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180

    total += dLng * (2 + Math.sin(lat1) + Math.sin(lat2))
  }

  return Math.abs((total * R * R) / 2)
}

/**
 * Format distance with appropriate units.
 */
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters.toFixed(1)} m`
  }
  return `${(meters / 1000).toFixed(2)} km`
}

/**
 * Format area with appropriate units.
 */
function formatArea(sqMeters: number): string {
  if (sqMeters < 10000) {
    return `${sqMeters.toFixed(1)} m²`
  }
  if (sqMeters < 1000000) {
    return `${(sqMeters / 10000).toFixed(2)} ha`
  }
  return `${(sqMeters / 1000000).toFixed(2)} km²`
}

export function MeasureTool() {
  const { activeTool, setMeasureResult, clearMeasurement } = useUIStore()
  const { backend, backendType } = useMapStore()
  const [points, setPoints] = useState<MeasurePoint[]>([])
  const markersRef = useRef<maplibregl.Marker[]>([])
  const sourceAddedRef = useRef(false)

  const isActive = activeTool === 'measure-distance' || activeTool === 'measure-area'
  const isMeasuringDistance = activeTool === 'measure-distance'

  // Cleanup function
  const cleanup = () => {
    if (backendType !== 'maplibre' || !backend) return

    const map = (backend as MapLibreAdapter).getNativeMap()
    if (!map) return

    // Remove markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    // Remove layers and source
    if (map.getLayer('measure-line')) map.removeLayer('measure-line')
    if (map.getLayer('measure-fill')) map.removeLayer('measure-fill')
    if (map.getSource('measure')) map.removeSource('measure')
    sourceAddedRef.current = false

    setPoints([])
  }

  // Handle map clicks for measurement
  useEffect(() => {
    if (!isActive || backendType !== 'maplibre' || !backend) return

    const map = (backend as MapLibreAdapter).getNativeMap()
    if (!map) return

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const newPoint: MeasurePoint = { lng: e.lngLat.lng, lat: e.lngLat.lat }

      setPoints((prev) => {
        const updated = [...prev, newPoint]

        // Add marker
        const marker = new maplibregl.Marker({ color: '#3b82f6' })
          .setLngLat([newPoint.lng, newPoint.lat])
          .addTo(map)
        markersRef.current.push(marker)

        // Update line/polygon on map
        updateMapGeometry(map, updated)

        // Calculate and set result
        if (isMeasuringDistance && updated.length >= 2) {
          let totalDistance = 0
          for (let i = 1; i < updated.length; i++) {
            totalDistance += haversineDistance(updated[i - 1], updated[i])
          }
          setMeasureResult({
            type: 'distance',
            value: totalDistance,
            unit: 'm',
            points: updated.map((p) => [p.lng, p.lat])
          })
        } else if (!isMeasuringDistance && updated.length >= 3) {
          const area = calculateArea(updated)
          setMeasureResult({
            type: 'area',
            value: area,
            unit: 'm²',
            points: updated.map((p) => [p.lng, p.lat])
          })
        }

        return updated
      })
    }

    const handleDoubleClick = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault()
      // Double-click finishes measurement but keeps result displayed
    }

    map.on('click', handleClick)
    map.on('dblclick', handleDoubleClick)

    // Change cursor
    map.getCanvas().style.cursor = 'crosshair'

    return () => {
      map.off('click', handleClick)
      map.off('dblclick', handleDoubleClick)
      map.getCanvas().style.cursor = ''
    }
  }, [isActive, backend, backendType, isMeasuringDistance, setMeasureResult])

  // Cleanup when tool is deactivated
  useEffect(() => {
    if (!isActive) {
      cleanup()
    }
  }, [isActive])

  const updateMapGeometry = (map: maplibregl.Map, measurePoints: MeasurePoint[]) => {
    if (measurePoints.length < 2) return

    const coordinates = measurePoints.map((p) => [p.lng, p.lat])

    // Create GeoJSON
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: isMeasuringDistance
            ? { type: 'LineString', coordinates }
            : { type: 'Polygon', coordinates: [[...coordinates, coordinates[0]]] }
        }
      ]
    }

    // Add or update source
    if (!sourceAddedRef.current) {
      map.addSource('measure', { type: 'geojson', data: geojson })

      if (isMeasuringDistance) {
        map.addLayer({
          id: 'measure-line',
          type: 'line',
          source: 'measure',
          paint: {
            'line-color': '#3b82f6',
            'line-width': 3,
            'line-dasharray': [2, 2]
          }
        })
      } else {
        map.addLayer({
          id: 'measure-fill',
          type: 'fill',
          source: 'measure',
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.2
          }
        })
        map.addLayer({
          id: 'measure-line',
          type: 'line',
          source: 'measure',
          paint: {
            'line-color': '#3b82f6',
            'line-width': 2
          }
        })
      }
      sourceAddedRef.current = true
    } else {
      const source = map.getSource('measure') as maplibregl.GeoJSONSource
      source.setData(geojson)
    }
  }

  // Only render UI when measuring
  if (!isActive) return null

  return (
    <div className="absolute bottom-16 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-3 shadow-lg">
      <div className="flex items-center gap-4">
        <div className="text-sm text-slate-300">
          {isMeasuringDistance ? (
            <>
              <span className="font-medium">Distance:</span>{' '}
              {points.length >= 2 ? (
                <span className="text-blue-400">
                  {formatDistance(
                    points.reduce((acc, p, i) => {
                      if (i === 0) return 0
                      return acc + haversineDistance(points[i - 1], p)
                    }, 0)
                  )}
                </span>
              ) : (
                <span className="text-slate-500">Click to add points</span>
              )}
            </>
          ) : (
            <>
              <span className="font-medium">Area:</span>{' '}
              {points.length >= 3 ? (
                <span className="text-blue-400">{formatArea(calculateArea(points))}</span>
              ) : (
                <span className="text-slate-500">Click to add points ({3 - points.length} more needed)</span>
              )}
            </>
          )}
        </div>

        <button
          onClick={clearMeasurement}
          className="rounded bg-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-600"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
