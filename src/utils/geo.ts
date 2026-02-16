/**
 * Shared geospatial utility functions.
 */

/**
 * Calculate bounding box from GeoJSON data.
 */
export function calculateBounds(geojson: GeoJSON.GeoJSON): [[number, number], [number, number]] | null {
  const coords: [number, number][] = []

  function extractCoords(geometry: GeoJSON.Geometry) {
    switch (geometry.type) {
      case 'Point':
        coords.push(geometry.coordinates as [number, number])
        break
      case 'MultiPoint':
      case 'LineString':
        (geometry.coordinates as [number, number][]).forEach(c => coords.push(c))
        break
      case 'MultiLineString':
      case 'Polygon':
        (geometry.coordinates as [number, number][][]).forEach(ring =>
          ring.forEach(c => coords.push(c))
        )
        break
      case 'MultiPolygon':
        (geometry.coordinates as [number, number][][][]).forEach(polygon =>
          polygon.forEach(ring => ring.forEach(c => coords.push(c)))
        )
        break
      case 'GeometryCollection':
        geometry.geometries.forEach(g => extractCoords(g))
        break
    }
  }

  if (geojson.type === 'Feature') {
    if (geojson.geometry) extractCoords(geojson.geometry)
  } else if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach(f => {
      if (f.geometry) extractCoords(f.geometry)
    })
  } else {
    extractCoords(geojson as GeoJSON.Geometry)
  }

  if (coords.length === 0) return null

  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity

  coords.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  })

  return [[minLng, minLat], [maxLng, maxLat]]
}

/**
 * Get the geometry type(s) present in a GeoJSON FeatureCollection.
 */
export function getGeometryTypes(geojson: GeoJSON.GeoJSON): string[] {
  const types = new Set<string>()

  if (geojson.type === 'Feature') {
    if (geojson.geometry) types.add(geojson.geometry.type)
  } else if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach(f => {
      if (f.geometry) types.add(f.geometry.type)
    })
  } else {
    types.add((geojson as GeoJSON.Geometry).type)
  }

  return Array.from(types)
}

/**
 * Get all unique property keys from a GeoJSON FeatureCollection.
 */
export function getPropertyKeys(geojson: GeoJSON.GeoJSON): string[] {
  const keys = new Set<string>()

  if (geojson.type === 'Feature') {
    if (geojson.properties) Object.keys(geojson.properties).forEach(k => keys.add(k))
  } else if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach(f => {
      if (f.properties) Object.keys(f.properties).forEach(k => keys.add(k))
    })
  }

  return Array.from(keys)
}

/**
 * Get features as rows for attribute table.
 */
export function getFeatureRows(geojson: GeoJSON.GeoJSON): { id: number; properties: Record<string, unknown>; geometry: GeoJSON.Geometry | null }[] {
  if (geojson.type === 'Feature') {
    return [{ id: 0, properties: geojson.properties || {}, geometry: geojson.geometry }]
  } else if (geojson.type === 'FeatureCollection') {
    return geojson.features.map((f, i) => ({
      id: i,
      properties: f.properties || {},
      geometry: f.geometry
    }))
  }
  return []
}

/**
 * Calculate basic statistics for a numeric field.
 */
export function calculateFieldStats(values: number[]): {
  count: number
  min: number
  max: number
  mean: number
  median: number
  sum: number
  stdDev: number
} {
  const sorted = [...values].sort((a, b) => a - b)
  const count = sorted.length
  const sum = sorted.reduce((a, b) => a + b, 0)
  const mean = sum / count
  const median = count % 2 === 0
    ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
    : sorted[Math.floor(count / 2)]
  const variance = sorted.reduce((acc, val) => acc + (val - mean) ** 2, 0) / count
  const stdDev = Math.sqrt(variance)

  return { count, min: sorted[0], max: sorted[count - 1], mean, median, sum, stdDev }
}

/**
 * Format coordinate display.
 */
export function formatCoordinate(lng: number, lat: number, format: 'decimal' | 'dms' = 'decimal'): string {
  if (format === 'dms') {
    return `${toDMS(lat, 'lat')} ${toDMS(lng, 'lng')}`
  }
  return `${lng.toFixed(6)}, ${lat.toFixed(6)}`
}

function toDMS(decimal: number, type: 'lat' | 'lng'): string {
  const absolute = Math.abs(decimal)
  const degrees = Math.floor(absolute)
  const minutesFloat = (absolute - degrees) * 60
  const minutes = Math.floor(minutesFloat)
  const seconds = ((minutesFloat - minutes) * 60).toFixed(1)

  const direction = type === 'lat'
    ? decimal >= 0 ? 'N' : 'S'
    : decimal >= 0 ? 'E' : 'W'

  return `${degrees}°${minutes}'${seconds}"${direction}`
}

/**
 * Calculate approximate map scale at a given latitude and zoom level.
 */
export function calculateScale(lat: number, zoom: number): number {
  const metersPerPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom)
  // Assume 96 DPI screen (0.0254 m per inch / 96 pixels per inch)
  const dpi = 96
  const metersPerInch = 0.0254
  return Math.round(metersPerPixel * dpi / metersPerInch)
}

/**
 * Format scale as a readable string.
 */
export function formatScale(scale: number): string {
  if (scale >= 1000000) {
    return `1:${(scale / 1000000).toFixed(1)}M`
  } else if (scale >= 1000) {
    return `1:${(scale / 1000).toFixed(0)}K`
  }
  return `1:${scale}`
}
