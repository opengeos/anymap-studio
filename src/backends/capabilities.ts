import type { BackendCapabilities, BackendInfo, BackendType } from './types'

export const BACKEND_CAPABILITIES: Record<BackendType, BackendCapabilities> = {
  maplibre: {
    supports2D: true,
    supports3D: false,
    supportsGlobe: false,
    supportsTerrain: true,
    supportsVectorTiles: true,
    supportsRasterTiles: true,
    supportsCOG: true,
    supportsPMTiles: true,
    supports3DTiles: false,
    supportsPointCloud: false,
    supportsLargeDatasets: true,
    supportsDrawing: true,
    supportsProjections: false
  },
  mapbox: {
    supports2D: true,
    supports3D: false,
    supportsGlobe: true,
    supportsTerrain: true,
    supportsVectorTiles: true,
    supportsRasterTiles: true,
    supportsCOG: true,
    supportsPMTiles: true,
    supports3DTiles: false,
    supportsPointCloud: false,
    supportsLargeDatasets: true,
    supportsDrawing: true,
    supportsProjections: false
  },
  leaflet: {
    supports2D: true,
    supports3D: false,
    supportsGlobe: false,
    supportsTerrain: false,
    supportsVectorTiles: true,
    supportsRasterTiles: true,
    supportsCOG: false,
    supportsPMTiles: false,
    supports3DTiles: false,
    supportsPointCloud: false,
    supportsLargeDatasets: false,
    supportsDrawing: true,
    supportsProjections: true
  },
  openlayers: {
    supports2D: true,
    supports3D: false,
    supportsGlobe: false,
    supportsTerrain: false,
    supportsVectorTiles: true,
    supportsRasterTiles: true,
    supportsCOG: true,
    supportsPMTiles: false,
    supports3DTiles: false,
    supportsPointCloud: false,
    supportsLargeDatasets: true,
    supportsDrawing: true,
    supportsProjections: true
  },
  deckgl: {
    supports2D: true,
    supports3D: true,
    supportsGlobe: true,
    supportsTerrain: true,
    supportsVectorTiles: true,
    supportsRasterTiles: true,
    supportsCOG: true,
    supportsPMTiles: true,
    supports3DTiles: true,
    supportsPointCloud: true,
    supportsLargeDatasets: true,
    supportsDrawing: false,
    supportsProjections: false
  },
  cesium: {
    supports2D: true,
    supports3D: true,
    supportsGlobe: true,
    supportsTerrain: true,
    supportsVectorTiles: false,
    supportsRasterTiles: true,
    supportsCOG: true,
    supportsPMTiles: false,
    supports3DTiles: true,
    supportsPointCloud: true,
    supportsLargeDatasets: true,
    supportsDrawing: true,
    supportsProjections: false
  },
  keplergl: {
    supports2D: true,
    supports3D: true,
    supportsGlobe: false,
    supportsTerrain: false,
    supportsVectorTiles: false,
    supportsRasterTiles: false,
    supportsCOG: false,
    supportsPMTiles: false,
    supports3DTiles: false,
    supportsPointCloud: false,
    supportsLargeDatasets: true,
    supportsDrawing: false,
    supportsProjections: false
  },
  potree: {
    supports2D: false,
    supports3D: true,
    supportsGlobe: false,
    supportsTerrain: false,
    supportsVectorTiles: false,
    supportsRasterTiles: false,
    supportsCOG: false,
    supportsPMTiles: false,
    supports3DTiles: false,
    supportsPointCloud: true,
    supportsLargeDatasets: true,
    supportsDrawing: false,
    supportsProjections: false
  }
}

export const BACKEND_INFO: Record<BackendType, BackendInfo> = {
  maplibre: {
    type: 'maplibre',
    name: 'MapLibre GL',
    description: 'Open-source vector map rendering with GPU acceleration',
    icon: 'map',
    capabilities: BACKEND_CAPABILITIES.maplibre,
    recommended: ['Vector tiles', 'PMTiles', 'COG rasters', 'GeoJSON', 'General mapping'],
    limitations: ['No true 3D globe', 'No 3D Tiles support']
  },
  mapbox: {
    type: 'mapbox',
    name: 'Mapbox GL',
    description: 'Commercial mapping platform with globe view',
    icon: 'globe',
    capabilities: BACKEND_CAPABILITIES.mapbox,
    recommended: ['Globe visualization', 'Mapbox styles', 'Commercial projects'],
    limitations: ['Requires API key', 'Commercial license']
  },
  leaflet: {
    type: 'leaflet',
    name: 'Leaflet',
    description: 'Lightweight and mobile-friendly mapping',
    icon: 'layers',
    capabilities: BACKEND_CAPABILITIES.leaflet,
    recommended: ['Simple maps', 'Mobile apps', 'WMS/WFS'],
    limitations: ['No GPU acceleration', 'Limited large dataset support']
  },
  openlayers: {
    type: 'openlayers',
    name: 'OpenLayers',
    description: 'Feature-rich with projection support',
    icon: 'compass',
    capabilities: BACKEND_CAPABILITIES.openlayers,
    recommended: ['WMS/WFS services', 'Custom projections', 'OGC standards'],
    limitations: ['Heavier bundle size', 'No 3D support']
  },
  deckgl: {
    type: 'deckgl',
    name: 'Deck.GL',
    description: 'GPU-powered large-scale data visualization',
    icon: 'bar-chart-3',
    capabilities: BACKEND_CAPABILITIES.deckgl,
    recommended: ['Large datasets', 'Data visualization', 'GPU acceleration', 'Point clouds'],
    limitations: ['No built-in drawing tools', 'Steeper learning curve']
  },
  cesium: {
    type: 'cesium',
    name: 'CesiumJS',
    description: '3D geospatial with globe and terrain',
    icon: 'globe-2',
    capabilities: BACKEND_CAPABILITIES.cesium,
    recommended: ['3D visualization', '3D Tiles', 'Terrain', 'Globe view', 'Flight paths'],
    limitations: ['Large bundle size (~2MB)', 'No vector tiles']
  },
  keplergl: {
    type: 'keplergl',
    name: 'Kepler.gl',
    description: 'Geospatial data exploration and analysis',
    icon: 'telescope',
    capabilities: BACKEND_CAPABILITIES.keplergl,
    recommended: ['Data exploration', 'Temporal data', 'Analytics'],
    limitations: ['Limited layer control', 'Opinionated UI']
  },
  potree: {
    type: 'potree',
    name: 'Potree',
    description: 'Point cloud visualization for LiDAR data',
    icon: 'scatter-chart',
    capabilities: BACKEND_CAPABILITIES.potree,
    recommended: ['LiDAR data', 'Point clouds', '3D scanning'],
    limitations: ['Only point cloud data', 'No 2D support']
  }
}

export function getBackendInfo(type: BackendType): BackendInfo {
  return BACKEND_INFO[type]
}

export function suggestBackend(requirements: Partial<BackendCapabilities>): BackendType[] {
  const scores: { type: BackendType; score: number }[] = []

  for (const [type, caps] of Object.entries(BACKEND_CAPABILITIES) as [BackendType, BackendCapabilities][]) {
    let score = 0
    let required = 0

    for (const [key, value] of Object.entries(requirements) as [keyof BackendCapabilities, boolean][]) {
      if (value) {
        required++
        if (caps[key]) score++
      }
    }

    if (required > 0) {
      scores.push({ type, score: score / required })
    }
  }

  return scores
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.type)
}

export function canMigrateLayer(
  _fromBackend: BackendType,
  toBackend: BackendType,
  layerType: string
): boolean {
  const toCaps = BACKEND_CAPABILITIES[toBackend]

  switch (layerType) {
    case 'geojson':
      return toCaps.supports2D || toCaps.supports3D
    case 'vector-tiles':
      return toCaps.supportsVectorTiles
    case 'raster':
    case 'raster-tiles':
      return toCaps.supportsRasterTiles
    case 'cog':
      return toCaps.supportsCOG
    case 'pmtiles':
      return toCaps.supportsPMTiles
    case '3d-tiles':
      return toCaps.supports3DTiles
    case 'point-cloud':
      return toCaps.supportsPointCloud
    case 'terrain':
      return toCaps.supportsTerrain
    default:
      return false
  }
}
