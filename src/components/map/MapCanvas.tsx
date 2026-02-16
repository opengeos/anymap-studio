import { useEffect, useRef, useCallback } from 'react'
import { createBackend, destroyBackend } from '../../backends'
import { useMapStore } from '../../stores/mapStore'
import { useProjectStore } from '../../stores/projectStore'
import type { IMapBackend } from '../../backends/types'

export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const backendRef = useRef<IMapBackend | null>(null)

  const { backendType, setBackend, setCursorPosition, setZoom, setLoading, setError } = useMapStore()
  const { view, layers } = useProjectStore()

  const initializeMap = useCallback(async () => {
    if (!containerRef.current) return

    setLoading(true)
    setError(null)

    try {
      // Clean up existing backend
      if (backendRef.current) {
        backendRef.current.destroy()
        backendRef.current = null
      }

      // Create new backend
      const backend = await createBackend(backendType, containerRef.current, {
        center: view.center,
        zoom: view.zoom,
        pitch: view.pitch,
        bearing: view.bearing
      })

      backendRef.current = backend
      setBackend(backend)

      // Set up event handlers
      backend.on('viewchange', (newView: unknown) => {
        const v = newView as { zoom: number }
        setZoom(v.zoom)
        useProjectStore.getState().setView(newView as { center: [number, number]; zoom: number })
      })

      // Track cursor position
      const nativeMap = backend.getNativeMap() as maplibregl.Map | null
      if (nativeMap && 'on' in nativeMap) {
        nativeMap.on('mousemove', (e: { lngLat: { lng: number; lat: number } }) => {
          setCursorPosition({ lng: e.lngLat.lng, lat: e.lngLat.lat })
        })

        nativeMap.on('mouseout', () => {
          setCursorPosition(null)
        })
      }

      // Add existing layers
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
  }, [backendType, setBackend, setCursorPosition, setZoom, setLoading, setError])

  useEffect(() => {
    initializeMap()

    return () => {
      if (backendRef.current) {
        backendRef.current.destroy()
        backendRef.current = null
      }
      destroyBackend(backendType)
    }
  }, [backendType])

  // Sync layer changes
  useEffect(() => {
    const backend = backendRef.current
    if (!backend || !backend.isInitialized) return

    const currentLayers = backend.getLayers()
    const currentIds = new Set(currentLayers.map((l) => l.id))
    const newIds = new Set(layers.map((l) => l.id))

    // Remove layers that no longer exist
    for (const layer of currentLayers) {
      if (!newIds.has(layer.id)) {
        backend.removeLayer(layer.id)
      }
    }

    // Add or update layers
    for (const layer of layers) {
      if (!currentIds.has(layer.id)) {
        backend.addLayer(layer).catch(console.error)
      } else {
        backend.updateLayer(layer.id, layer)
      }
    }
  }, [layers])

  return (
    <div ref={containerRef} className="h-full w-full">
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
