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

export class LeafletAdapter implements IMapBackend {
  readonly type: BackendType = 'leaflet'
  readonly capabilities: BackendCapabilities = BACKEND_CAPABILITIES.leaflet

  private map: unknown = null
  private layers: Map<string, UnifiedLayerConfig> = new Map()
  private eventHandlers: Map<string, Set<EventCallback>> = new Map()

  get isInitialized(): boolean {
    return this.map !== null
  }

  async initialize(_container: HTMLElement, _options: MapOptions = {}): Promise<void> {
    throw new Error('Leaflet adapter not yet implemented')
  }

  destroy(): void {
    this.map = null
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

  setView(_options: ViewOptions): void {}

  getView(): ViewOptions {
    return { center: [0, 0], zoom: 2 }
  }

  fitBounds(_bounds: [[number, number], [number, number]], _padding?: number): void {}

  exportState(): SerializedState {
    return { view: this.getView(), layers: this.getLayers() }
  }

  async importState(_state: SerializedState): Promise<void> {}

  getNativeMap(): unknown {
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
}
