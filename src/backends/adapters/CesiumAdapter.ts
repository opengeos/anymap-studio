import * as Cesium from 'cesium'
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

/**
 * Cesium 3D globe adapter for desktop GIS application.
 * Provides 3D globe visualization with terrain, 3D Tiles, and GeoJSON support.
 */
export class CesiumAdapter implements IMapBackend {
  readonly type: BackendType = 'cesium'
  readonly capabilities: BackendCapabilities = BACKEND_CAPABILITIES.cesium

  private viewer: Cesium.Viewer | null = null
  private layers: Map<string, UnifiedLayerConfig> = new Map()
  private dataSources: Map<string, Cesium.GeoJsonDataSource> = new Map()
  private tilesets: Map<string, Cesium.Cesium3DTileset> = new Map()
  private imageryLayers: Map<string, Cesium.ImageryLayer> = new Map()
  private eventHandlers: Map<string, Set<EventCallback>> = new Map()

  get isInitialized(): boolean {
    return this.viewer !== null
  }

  async initialize(container: HTMLElement, options: MapOptions = {}): Promise<void> {
    // Set Cesium Ion access token if provided
    if (options.style && options.style.startsWith('cesium-ion:')) {
      Cesium.Ion.defaultAccessToken = options.style.replace('cesium-ion:', '')
    }

    // Calculate initial camera height from zoom
    const height = this.zoomToHeight(options.zoom || 2)

    // Create the viewer
    this.viewer = new Cesium.Viewer(container, {
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      vrButton: false,
      selectionIndicator: false,
      infoBox: false,
      creditContainer: document.createElement('div'), // Hide credits
    })

    // Set initial camera position
    const center = options.center || [0, 0]
    this.viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(center[0], center[1], height),
      orientation: {
        heading: Cesium.Math.toRadians(options.bearing || 0),
        pitch: Cesium.Math.toRadians(options.pitch ? options.pitch - 90 : -90),
        roll: 0
      }
    })

    // Enable terrain if requested
    if (options.terrain) {
      this.viewer.scene.setTerrain(
        Cesium.Terrain.fromWorldTerrain({
          requestVertexNormals: true,
          requestWaterMask: true
        })
      )
    }

    // Forward camera change events
    this.viewer.camera.changed.addEventListener(() => {
      this.emit('viewchange', this.getView())
    })

    // Forward click events
    const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas)
    handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
      const cartesian = this.viewer?.camera.pickEllipsoid(click.position)
      if (cartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
        this.emit('click', {
          lngLat: {
            lng: Cesium.Math.toDegrees(cartographic.longitude),
            lat: Cesium.Math.toDegrees(cartographic.latitude)
          },
          point: click.position
        })
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  }

  destroy(): void {
    if (this.viewer) {
      this.viewer.destroy()
      this.viewer = null
    }
    this.layers.clear()
    this.dataSources.clear()
    this.tilesets.clear()
    this.imageryLayers.clear()
    this.eventHandlers.clear()
  }

  async addLayer(config: UnifiedLayerConfig): Promise<string> {
    if (!this.viewer) throw new Error('Viewer not initialized')

    switch (config.type) {
      case 'geojson':
        await this.addGeoJSONLayer(config)
        break
      case '3d-tiles':
        await this.add3DTilesLayer(config)
        break
      case 'raster':
      case 'cog':
        this.addImageryLayer(config)
        break
      default:
        console.warn(`Layer type ${config.type} not fully supported in Cesium`)
    }

    this.layers.set(config.id, config)
    this.emit('layeradd', config)
    return config.id
  }

  private async addGeoJSONLayer(config: UnifiedLayerConfig): Promise<void> {
    if (!this.viewer) return

    const style = config.style || {}
    const data = config.source.data || config.source.url

    if (!data) return

    const dataSource = await Cesium.GeoJsonDataSource.load(data, {
      stroke: Cesium.Color.fromCssColorString(style.strokeColor || '#3388ff'),
      strokeWidth: style.strokeWidth || 2,
      fill: Cesium.Color.fromCssColorString(style.fillColor || '#3388ff').withAlpha(style.fillOpacity ?? 0.5),
      clampToGround: true
    })

    // Apply opacity to all entities
    if (config.opacity !== undefined && config.opacity < 1) {
      dataSource.entities.values.forEach(entity => {
        if (entity.polygon) {
          const material = entity.polygon.material as Cesium.ColorMaterialProperty
          if (material?.color) {
            const color = material.color.getValue(Cesium.JulianDate.now())
            if (color) {
              entity.polygon.material = new Cesium.ColorMaterialProperty(
                color.withAlpha(color.alpha * config.opacity)
              )
            }
          }
        }
      })
    }

    dataSource.show = config.visible !== false
    await this.viewer.dataSources.add(dataSource)
    this.dataSources.set(config.id, dataSource)
  }

  private async add3DTilesLayer(config: UnifiedLayerConfig): Promise<void> {
    if (!this.viewer) return

    const url = config.source.url
    if (!url) return

    let tileset: Cesium.Cesium3DTileset

    // Check if it's a Cesium Ion asset ID
    if (/^\d+$/.test(url)) {
      tileset = await Cesium.Cesium3DTileset.fromIonAssetId(parseInt(url))
    } else {
      tileset = await Cesium.Cesium3DTileset.fromUrl(url)
    }

    tileset.show = config.visible !== false
    this.viewer.scene.primitives.add(tileset)
    this.tilesets.set(config.id, tileset)
  }

  private addImageryLayer(config: UnifiedLayerConfig): void {
    if (!this.viewer) return

    const url = config.source.url || config.source.tiles?.[0]
    if (!url) return

    const imageryProvider = new Cesium.UrlTemplateImageryProvider({
      url: url
    })

    const layer = this.viewer.imageryLayers.addImageryProvider(imageryProvider)
    layer.alpha = config.opacity ?? 1
    layer.show = config.visible !== false
    this.imageryLayers.set(config.id, layer)
  }

  removeLayer(id: string): void {
    if (!this.viewer) return

    // Remove from dataSources
    const dataSource = this.dataSources.get(id)
    if (dataSource) {
      this.viewer.dataSources.remove(dataSource)
      this.dataSources.delete(id)
    }

    // Remove from tilesets
    const tileset = this.tilesets.get(id)
    if (tileset) {
      this.viewer.scene.primitives.remove(tileset)
      this.tilesets.delete(id)
    }

    // Remove from imagery layers
    const imageryLayer = this.imageryLayers.get(id)
    if (imageryLayer) {
      this.viewer.imageryLayers.remove(imageryLayer)
      this.imageryLayers.delete(id)
    }

    this.layers.delete(id)
    this.emit('layerremove', { id })
  }

  updateLayer(id: string, updates: Partial<UnifiedLayerConfig>): void {
    const config = this.layers.get(id)
    if (!config) return

    // Update visibility
    if (updates.visible !== undefined) {
      const dataSource = this.dataSources.get(id)
      if (dataSource) dataSource.show = updates.visible

      const tileset = this.tilesets.get(id)
      if (tileset) tileset.show = updates.visible

      const imageryLayer = this.imageryLayers.get(id)
      if (imageryLayer) imageryLayer.show = updates.visible
    }

    // Update opacity
    if (updates.opacity !== undefined) {
      const imageryLayer = this.imageryLayers.get(id)
      if (imageryLayer) imageryLayer.alpha = updates.opacity

      // For GeoJSON, we'd need to update entity materials
      const dataSource = this.dataSources.get(id)
      if (dataSource) {
        dataSource.entities.values.forEach(entity => {
          if (entity.polygon?.material) {
            const material = entity.polygon.material as Cesium.ColorMaterialProperty
            const color = material.color?.getValue(Cesium.JulianDate.now())
            if (color) {
              entity.polygon.material = new Cesium.ColorMaterialProperty(
                color.withAlpha(updates.opacity!)
              )
            }
          }
        })
      }
    }

    this.layers.set(id, { ...config, ...updates })
  }

  getLayer(id: string): UnifiedLayerConfig | undefined {
    return this.layers.get(id)
  }

  getLayers(): UnifiedLayerConfig[] {
    return Array.from(this.layers.values())
  }

  setView(options: ViewOptions): void {
    if (!this.viewer) return

    const height = this.zoomToHeight(options.zoom || 2)

    this.viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        options.center[0],
        options.center[1],
        height
      ),
      orientation: {
        heading: Cesium.Math.toRadians(options.bearing || 0),
        pitch: Cesium.Math.toRadians(options.pitch ? options.pitch - 90 : -90),
        roll: 0
      }
    })
  }

  getView(): ViewOptions {
    if (!this.viewer) {
      return { center: [0, 0], zoom: 2 }
    }

    const cartographic = this.viewer.camera.positionCartographic
    const height = cartographic.height

    return {
      center: [
        Cesium.Math.toDegrees(cartographic.longitude),
        Cesium.Math.toDegrees(cartographic.latitude)
      ],
      zoom: this.heightToZoom(height),
      pitch: Cesium.Math.toDegrees(this.viewer.camera.pitch) + 90,
      bearing: Cesium.Math.toDegrees(this.viewer.camera.heading)
    }
  }

  fitBounds(bounds: [[number, number], [number, number]], _padding = 50): void {
    if (!this.viewer) return

    const rectangle = Cesium.Rectangle.fromDegrees(
      bounds[0][0], // west
      bounds[0][1], // south
      bounds[1][0], // east
      bounds[1][1]  // north
    )

    this.viewer.camera.flyTo({
      destination: rectangle,
      duration: 1.5
    })
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

  getNativeMap(): Cesium.Viewer | null {
    return this.viewer
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

  /**
   * Convert zoom level to camera height (rough approximation).
   */
  private zoomToHeight(zoom: number): number {
    return 40000000 / Math.pow(2, zoom)
  }

  /**
   * Convert camera height to zoom level.
   */
  private heightToZoom(height: number): number {
    return Math.log2(40000000 / height)
  }
}
