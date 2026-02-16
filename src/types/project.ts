import type { BackendType } from '../backends/types'

export interface ViewOptions {
  center: [number, number]
  zoom: number
  pitch?: number
  bearing?: number
}

export interface LayerStyle {
  fillColor?: string
  fillOpacity?: number
  strokeColor?: string
  strokeWidth?: number
  strokeOpacity?: number
  pointRadius?: number
  pointColor?: string
}

export interface UnifiedLayerConfig {
  id: string
  name: string
  type: 'geojson' | 'raster' | 'vector-tiles' | 'pmtiles' | 'cog' | '3d-tiles' | 'terrain' | 'point-cloud'
  visible: boolean
  opacity: number
  source: {
    type: string
    url?: string
    data?: unknown
    tiles?: string[]
    attribution?: string
  }
  style?: LayerStyle
  metadata?: Record<string, unknown>
  zIndex?: number
}

export interface AnyMapProject {
  version: string
  backend: BackendType
  view: ViewOptions
  layers: UnifiedLayerConfig[]
  metadata: {
    name: string
    description?: string
    created: string
    modified: string
  }
}

export interface RecentProject {
  path: string
  name: string
  lastOpened: string
}
