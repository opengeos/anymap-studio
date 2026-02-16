import type { UnifiedLayerConfig, ViewOptions } from '../types/project'

export type BackendType =
  | 'maplibre'
  | 'mapbox'
  | 'leaflet'
  | 'openlayers'
  | 'deckgl'
  | 'cesium'
  | 'keplergl'
  | 'potree'

export interface BackendCapabilities {
  supports2D: boolean
  supports3D: boolean
  supportsGlobe: boolean
  supportsTerrain: boolean
  supportsVectorTiles: boolean
  supportsRasterTiles: boolean
  supportsCOG: boolean
  supportsPMTiles: boolean
  supports3DTiles: boolean
  supportsPointCloud: boolean
  supportsLargeDatasets: boolean
  supportsDrawing: boolean
  supportsProjections: boolean
}

export interface MapOptions {
  center?: [number, number]
  zoom?: number
  pitch?: number
  bearing?: number
  style?: string
  terrain?: boolean
}

export interface SerializedState {
  view: ViewOptions
  layers: UnifiedLayerConfig[]
}

export interface IMapBackend {
  readonly type: BackendType
  readonly capabilities: BackendCapabilities
  readonly isInitialized: boolean

  initialize(container: HTMLElement, options: MapOptions): Promise<void>
  destroy(): void

  addLayer(config: UnifiedLayerConfig): Promise<string>
  removeLayer(id: string): void
  updateLayer(id: string, config: Partial<UnifiedLayerConfig>): void
  getLayer(id: string): UnifiedLayerConfig | undefined
  getLayers(): UnifiedLayerConfig[]

  setView(options: ViewOptions): void
  getView(): ViewOptions
  fitBounds(bounds: [[number, number], [number, number]], padding?: number): void

  exportState(): SerializedState
  importState(state: SerializedState): Promise<void>

  getNativeMap(): unknown

  on(event: string, callback: (...args: unknown[]) => void): void
  off(event: string, callback: (...args: unknown[]) => void): void
}

export interface BackendInfo {
  type: BackendType
  name: string
  description: string
  icon: string
  capabilities: BackendCapabilities
  recommended: string[]
  limitations: string[]
}
