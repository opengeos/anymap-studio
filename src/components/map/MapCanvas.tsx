import { useEffect, useRef, useCallback, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { createBackend, destroyBackend } from '../../backends'
import { useMapStore } from '../../stores/mapStore'
import { useProjectStore } from '../../stores/projectStore'
import { useUIStore } from '../../stores/uiStore'
import type { IMapBackend } from '../../backends/types'
import type { UnifiedLayerConfig } from '../../types/project'
import { parseKML, parseCSV, detectFileType, autoDetectCoordinateColumns, getCSVHeaders } from '../../utils/parsers'
import { calculateBounds } from '../../utils/geo'
import shp from 'shpjs'

export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const backendRef = useRef<IMapBackend | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)

  const { backendType, setBackend, setCursorPosition, setZoom, setLoading, setError } = useMapStore()
  const { view, layers, addLayer } = useProjectStore()
  const { activeTool } = useUIStore()

  const [isDragOver, setIsDragOver] = useState(false)

  const getRandomColor = () => {
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']
    return colors[Math.floor(Math.random() * colors.length)]
  }

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

    const backend = backendRef.current
    if (backend) {
      await backend.addLayer(layerConfig)
      const bounds = calculateBounds(data)
      if (bounds) backend.fitBounds(bounds, 50)
    }
  }

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    for (const file of files) {
      const name = file.name.replace(/\.\w+$/, '')
      const fileType = detectFileType(file.name)

      try {
        if (fileType === 'geojson') {
          const text = await file.text()
          const data = JSON.parse(text) as GeoJSON.GeoJSON
          await addLayerWithData(data, name)
        } else if (fileType === 'kml') {
          const text = await file.text()
          const data = parseKML(text)
          await addLayerWithData(data, name)
        } else if (fileType === 'csv') {
          const text = await file.text()
          const headers = getCSVHeaders(text)
          const detected = autoDetectCoordinateColumns(headers)
          if (detected.lat && detected.lng) {
            const data = parseCSV(text, { latColumn: detected.lat, lngColumn: detected.lng })
            await addLayerWithData(data, name)
          } else {
            alert(`CSV file "${file.name}": Could not auto-detect coordinate columns. Please use the Add File dialog.`)
          }
        } else if (fileType === 'shapefile') {
          const buffer = await file.arrayBuffer()
          const data = await shp(buffer) as GeoJSON.GeoJSON
          await addLayerWithData(data, name)
        } else {
          alert(`Unsupported file format: ${file.name}`)
        }
      } catch (err) {
        console.error(`Failed to load dropped file ${file.name}:`, err)
        alert(`Failed to load ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
  }, [addLayer])

  // Handle identify click
  const handleMapClick = useCallback((e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
    const tool = useUIStore.getState().activeTool
    if (tool !== 'identify') return

    const map = backendRef.current?.getNativeMap() as maplibregl.Map | null
    if (!map) return

    // Remove existing popup
    if (popupRef.current) {
      popupRef.current.remove()
      popupRef.current = null
    }

    // Query features at the click point
    const projectLayers = useProjectStore.getState().layers
    const queryLayerIds: string[] = []
    for (const layer of projectLayers) {
      if (layer.visible && layer.type === 'geojson') {
        const ids = [`${layer.id}-fill`, `${layer.id}-line`, `${layer.id}-point`]
        for (const id of ids) {
          if (map.getLayer(id)) queryLayerIds.push(id)
        }
      }
    }

    if (queryLayerIds.length === 0) return

    const features = map.queryRenderedFeatures(e.point, { layers: queryLayerIds })
    if (features.length === 0) return

    const feature = features[0]
    const properties = feature.properties || {}

    // Build popup content
    let html = '<div style="max-height:300px;overflow-y:auto;font-size:12px;">'
    html += '<table style="border-collapse:collapse;width:100%;">'
    for (const [key, value] of Object.entries(properties)) {
      html += `<tr><td style="padding:3px 8px 3px 0;color:#94a3b8;white-space:nowrap;vertical-align:top;font-weight:500;">${key}</td>`
      html += `<td style="padding:3px 0;color:#e2e8f0;word-break:break-all;">${value}</td></tr>`
    }
    html += '</table></div>'

    popupRef.current = new maplibregl.Popup({ maxWidth: '360px' })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(map)
  }, [])

  const initializeMap = useCallback(async () => {
    if (!containerRef.current) return

    setLoading(true)
    setError(null)

    try {
      if (backendRef.current) {
        backendRef.current.destroy()
        backendRef.current = null
      }

      const backend = await createBackend(backendType, containerRef.current, {
        center: view.center,
        zoom: view.zoom,
        pitch: view.pitch,
        bearing: view.bearing
      })

      backendRef.current = backend
      setBackend(backend)

      backend.on('viewchange', (newView: unknown) => {
        const v = newView as { zoom: number }
        setZoom(v.zoom)
        useProjectStore.getState().setView(newView as { center: [number, number]; zoom: number })
      })

      const nativeMap = backend.getNativeMap() as maplibregl.Map | null
      if (nativeMap && 'on' in nativeMap) {
        nativeMap.on('mousemove', (e: { lngLat: { lng: number; lat: number } }) => {
          setCursorPosition({ lng: e.lngLat.lng, lat: e.lngLat.lat })
        })

        nativeMap.on('mouseout', () => {
          setCursorPosition(null)
        })

        // Identify click handler
        nativeMap.on('click', handleMapClick as (e: maplibregl.MapMouseEvent) => void)
      }

      for (const layer of layers) {
        try {
          await backend.addLayer(layer)
        } catch (e) {
          console.error(`Failed to add layer ${layer.id}:`, e)
        }
      }

      setZoom(view.zoom)
    } catch (e) {
      console.error('Failed to initialize map:', e)
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [backendType, setBackend, setCursorPosition, setZoom, setLoading, setError, handleMapClick])

  useEffect(() => {
    initializeMap()

    return () => {
      if (popupRef.current) {
        popupRef.current.remove()
        popupRef.current = null
      }
      if (backendRef.current) {
        backendRef.current.destroy()
        backendRef.current = null
      }
      destroyBackend(backendType)
    }
  }, [backendType])

  // Update cursor style based on active tool
  useEffect(() => {
    const map = backendRef.current?.getNativeMap() as maplibregl.Map | null
    if (!map) return

    if (activeTool === 'identify') {
      map.getCanvas().style.cursor = 'help'
    } else if (activeTool.startsWith('measure') || activeTool.startsWith('draw')) {
      map.getCanvas().style.cursor = 'crosshair'
    } else {
      map.getCanvas().style.cursor = ''
    }
  }, [activeTool])

  // Sync layer changes
  useEffect(() => {
    const backend = backendRef.current
    if (!backend || !backend.isInitialized) return

    const currentLayers = backend.getLayers()
    const currentIds = new Set(currentLayers.map((l) => l.id))
    const newIds = new Set(layers.map((l) => l.id))

    for (const layer of currentLayers) {
      if (!newIds.has(layer.id)) {
        backend.removeLayer(layer.id)
      }
    }

    for (const layer of layers) {
      if (!currentIds.has(layer.id)) {
        backend.addLayer(layer).catch(console.error)
      } else {
        backend.updateLayer(layer.id, layer)
      }
    }
  }, [layers])

  return (
    <div
      ref={containerRef}
      className="h-full w-full relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-blue-600/20 border-2 border-dashed border-blue-400 pointer-events-none">
          <div className="rounded-2xl bg-slate-900/90 px-8 py-6 text-center shadow-2xl">
            <p className="text-lg font-semibold text-blue-300">Drop files to add layers</p>
            <p className="mt-1 text-sm text-slate-400">GeoJSON, Shapefile, KML, CSV</p>
          </div>
        </div>
      )}

      {useMapStore.getState().isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="text-center">
            <div className="mb-2 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {useMapStore.getState().error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="max-w-md rounded-lg border border-destructive bg-card p-6 text-center">
            <p className="mb-2 font-medium text-destructive">Failed to load map</p>
            <p className="text-sm text-muted-foreground">{useMapStore.getState().error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
