import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import type {
  BackendCapabilities,
  BackendType,
  IMapBackend,
  MapOptions,
  SerializedState
} from '../types'
import { BACKEND_CAPABILITIES } from '../capabilities'
import type { UnifiedLayerConfig, ViewOptions } from '../../types/project'

type EventCallback = (...args: unknown[]) => void

export class MapLibreAdapter implements IMapBackend {
  readonly type: BackendType = 'maplibre'
  readonly capabilities: BackendCapabilities = BACKEND_CAPABILITIES.maplibre

  private map: maplibregl.Map | null = null
  private layers: Map<string, UnifiedLayerConfig> = new Map()
  private eventHandlers: Map<string, Set<EventCallback>> = new Map()
  private pmtilesProtocol: Protocol | null = null

  get isInitialized(): boolean {
    return this.map !== null
  }

  async initialize(container: HTMLElement, options: MapOptions = {}): Promise<void> {
    // Register PMTiles protocol
    this.pmtilesProtocol = new Protocol()
    maplibregl.addProtocol('pmtiles', this.pmtilesProtocol.tile)

    // Use a basemap style - OpenFreeMap Liberty style (free, no API key required)
    // Alternative: 'https://demotiles.maplibre.org/style.json' for MapLibre demo tiles
    const defaultStyle = options.style || 'https://tiles.openfreemap.org/styles/liberty'

    this.map = new maplibregl.Map({
      container,
      style: defaultStyle,
      center: options.center || [0, 0],
      zoom: options.zoom || 2,
      pitch: options.pitch || 0,
      bearing: options.bearing || 0,
      attributionControl: { compact: false }
    })

    // Add navigation controls
    this.map.addControl(new maplibregl.NavigationControl(), 'top-right')
    this.map.addControl(new maplibregl.GlobeControl(), 'top-right')
    this.map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    // Wait for map to load
    await new Promise<void>((resolve) => {
      this.map!.on('load', () => resolve())
    })

    // Forward map events
    this.map.on('moveend', () => this.emit('viewchange', this.getView()))
    this.map.on('click', (e) => this.emit('click', { lngLat: e.lngLat, point: e.point }))
  }

  destroy(): void {
    if (this.pmtilesProtocol) {
      maplibregl.removeProtocol('pmtiles')
      this.pmtilesProtocol = null
    }

    if (this.map) {
      this.map.remove()
      this.map = null
    }

    this.layers.clear()
    this.eventHandlers.clear()
  }

  /**
   * Clear internal layer tracking. Used when basemap style changes.
   */
  clearLayerTracking(): void {
    this.layers.clear()
  }

  async addLayer(config: UnifiedLayerConfig): Promise<string> {
    if (!this.map) throw new Error('Map not initialized')

    const sourceId = `source-${config.id}`
    const layerId = config.id

    // Remove existing layer/source if they exist (for re-adding after style change)
    this.removeLayer(config.id)

    // Add source based on layer type
    switch (config.type) {
      case 'geojson':
        this.map.addSource(sourceId, {
          type: 'geojson',
          data: config.source.data as GeoJSON.GeoJSON || config.source.url || { type: 'FeatureCollection', features: [] }
        })
        this.addGeoJSONLayers(layerId, sourceId, config)
        break

      case 'raster':
      case 'cog':
        this.map.addSource(sourceId, {
          type: 'raster',
          tiles: config.source.tiles || [config.source.url!],
          tileSize: 256,
          attribution: config.source.attribution
        })
        this.map.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          paint: {
            'raster-opacity': config.opacity
          }
        })
        break

      case 'vector-tiles':
        this.map.addSource(sourceId, {
          type: 'vector',
          tiles: config.source.tiles || [config.source.url!],
          attribution: config.source.attribution
        })
        break

      case 'pmtiles':
        this.map.addSource(sourceId, {
          type: 'vector',
          url: `pmtiles://${config.source.url}`,
          attribution: config.source.attribution
        })
        break

      default:
        console.warn(`Layer type ${config.type} not fully supported in MapLibre`)
    }

    this.layers.set(config.id, config)
    this.emit('layeradd', config)

    return config.id
  }

  private addGeoJSONLayers(baseId: string, sourceId: string, config: UnifiedLayerConfig): void {
    if (!this.map) return

    const style = config.style || {}
    const opacity = config.opacity

    // Add fill layer for polygons
    this.map.addLayer({
      id: `${baseId}-fill`,
      type: 'fill',
      source: sourceId,
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'fill-color': style.fillColor || '#3b82f6',
        'fill-opacity': (style.fillOpacity ?? 0.5) * opacity
      },
      layout: {
        visibility: config.visible ? 'visible' : 'none'
      }
    })

    // Add line layer for lines and polygon outlines
    this.map.addLayer({
      id: `${baseId}-line`,
      type: 'line',
      source: sourceId,
      filter: ['any', ['==', '$type', 'LineString'], ['==', '$type', 'Polygon']],
      paint: {
        'line-color': style.strokeColor || '#2563eb',
        'line-width': style.strokeWidth || 2,
        'line-opacity': (style.strokeOpacity ?? 1) * opacity
      },
      layout: {
        visibility: config.visible ? 'visible' : 'none'
      }
    })

    // Add circle layer for points
    this.map.addLayer({
      id: `${baseId}-point`,
      type: 'circle',
      source: sourceId,
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': style.pointRadius || 6,
        'circle-color': style.pointColor || style.fillColor || '#3b82f6',
        'circle-opacity': opacity,
        'circle-stroke-color': style.strokeColor || '#1d4ed8',
        'circle-stroke-width': 1
      },
      layout: {
        visibility: config.visible ? 'visible' : 'none'
      }
    })
  }

  removeLayer(id: string): void {
    if (!this.map) return

    const config = this.layers.get(id)
    if (!config) return

    const sourceId = `source-${id}`

    // Remove all associated layers (including label, highlight, heatmap)
    const layerIds = [`${id}-fill`, `${id}-line`, `${id}-point`, `${id}-label`, `${id}-highlight-line`, `${id}-heatmap`, id]
    for (const layerId of layerIds) {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId)
      }
    }

    // Remove sources (including highlight and heatmap sources)
    const sourceIds = [sourceId, `${id}-highlight-source`, `${id}-heatmap-source`]
    for (const sid of sourceIds) {
      if (this.map.getSource(sid)) {
        this.map.removeSource(sid)
      }
    }

    this.layers.delete(id)
    this.emit('layerremove', config)
  }

  updateLayer(id: string, updates: Partial<UnifiedLayerConfig>): void {
    if (!this.map) return

    const config = this.layers.get(id)
    if (!config) return

    // Update visibility
    if (updates.visible !== undefined) {
      const visibility = updates.visible ? 'visible' : 'none'
      const layerIds = [`${id}-fill`, `${id}-line`, `${id}-point`, id]
      for (const layerId of layerIds) {
        if (this.map.getLayer(layerId)) {
          this.map.setLayoutProperty(layerId, 'visibility', visibility)
        }
      }
    }

    // Update opacity
    if (updates.opacity !== undefined) {
      const layerIds = [`${id}-fill`, `${id}-line`, `${id}-point`, id]
      for (const layerId of layerIds) {
        const layer = this.map.getLayer(layerId)
        if (layer) {
          const layerType = layer.type
          switch (layerType) {
            case 'fill':
              this.map.setPaintProperty(layerId, 'fill-opacity', updates.opacity * 0.5)
              break
            case 'line':
              this.map.setPaintProperty(layerId, 'line-opacity', updates.opacity)
              break
            case 'circle':
              this.map.setPaintProperty(layerId, 'circle-opacity', updates.opacity)
              break
            case 'raster':
              this.map.setPaintProperty(layerId, 'raster-opacity', updates.opacity)
              break
          }
        }
      }
    }

    // Merge updates
    this.layers.set(id, { ...config, ...updates })
  }

  getLayer(id: string): UnifiedLayerConfig | undefined {
    return this.layers.get(id)
  }

  getLayers(): UnifiedLayerConfig[] {
    return Array.from(this.layers.values())
  }

  setView(options: ViewOptions): void {
    if (!this.map) return

    this.map.jumpTo({
      center: options.center,
      zoom: options.zoom,
      pitch: options.pitch,
      bearing: options.bearing
    })
  }

  getView(): ViewOptions {
    if (!this.map) {
      return { center: [0, 0], zoom: 2 }
    }

    const center = this.map.getCenter()
    return {
      center: [center.lng, center.lat],
      zoom: this.map.getZoom(),
      pitch: this.map.getPitch(),
      bearing: this.map.getBearing()
    }
  }

  fitBounds(bounds: [[number, number], [number, number]], padding = 50): void {
    if (!this.map) return

    this.map.fitBounds(bounds, { padding })
  }

  exportState(): SerializedState {
    return {
      view: this.getView(),
      layers: this.getLayers()
    }
  }

  async importState(state: SerializedState): Promise<void> {
    // Clear existing layers
    for (const layer of this.layers.values()) {
      this.removeLayer(layer.id)
    }

    // Set view
    this.setView(state.view)

    // Add layers
    for (const layer of state.layers) {
      await this.addLayer(layer)
    }
  }

  getNativeMap(): maplibregl.Map | null {
    return this.map
  }

  on(event: string, callback: EventCallback): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(callback)
  }

  off(event: string, callback: EventCallback): void {
    this.eventHandlers.get(event)?.delete(callback)
  }

  private emit(event: string, ...args: unknown[]): void {
    this.eventHandlers.get(event)?.forEach(cb => cb(...args))
  }
}
