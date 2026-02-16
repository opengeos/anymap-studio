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

export class CesiumAdapter implements IMapBackend {
  readonly type: BackendType = 'cesium'
  readonly capabilities: BackendCapabilities = BACKEND_CAPABILITIES.cesium

  private viewer: unknown = null
  private layers: Map<string, UnifiedLayerConfig> = new Map()
  private eventHandlers: Map<string, Set<EventCallback>> = new Map()

  get isInitialized(): boolean {
    return this.viewer !== null
  }

  async initialize(_container: HTMLElement, _options: MapOptions = {}): Promise<void> {
    // Cesium implementation will be added in Phase 4
    throw new Error('Cesium adapter not yet implemented')
  }

  destroy(): void {
    this.viewer = null
    this.layers.clear()
    this.eventHandlers.clear()
  }

  async addLayer(config: UnifiedLayerConfig): Promise<string> {
    this.layers.set(config.id, config)
    return config.id
  }

  removeLayer(id: string): void {
    this.layers.delete(id)
  }

  updateLayer(id: string, updates: Partial<UnifiedLayerConfig>): void {
    const config = this.layers.get(id)
    if (config) {
      this.layers.set(id, { ...config, ...updates })
    }
  }

  getLayer(id: string): UnifiedLayerConfig | undefined {
    return this.layers.get(id)
  }

  getLayers(): UnifiedLayerConfig[] {
    return Array.from(this.layers.values())
  }

  setView(_options: ViewOptions): void {
    // Not implemented
  }

  getView(): ViewOptions {
    return { center: [0, 0], zoom: 2 }
  }

  fitBounds(_bounds: [[number, number], [number, number]], _padding?: number): void {
    // Not implemented
  }

  exportState(): SerializedState {
    return {
      view: this.getView(),
      layers: this.getLayers()
    }
  }

  async importState(_state: SerializedState): Promise<void> {
    // Not implemented
  }

  getNativeMap(): unknown {
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
}
