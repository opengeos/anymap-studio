/**
 * Export utilities for map and layer data.
 */

/**
 * Export the map canvas to a PNG image.
 */
export async function exportMapToPNG(map: maplibregl.Map): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      map.once('render', () => {
        const canvas = map.getCanvas()
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create PNG blob'))
          }
        }, 'image/png')
      })
      map.triggerRepaint()
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * Export GeoJSON data to a downloadable file.
 */
export function exportToGeoJSON(data: GeoJSON.GeoJSON, fileName: string): void {
  const json = JSON.stringify(data, null, 2)
  downloadString(json, `${fileName}.geojson`, 'application/geo+json')
}

/**
 * Export data as CSV.
 */
export function exportToCSV(features: GeoJSON.Feature[], fileName: string): void {
  if (features.length === 0) return

  // Collect all unique property keys
  const keys = new Set<string>()
  features.forEach(f => {
    if (f.properties) Object.keys(f.properties).forEach(k => keys.add(k))
  })
  const headers = Array.from(keys)

  // Add geometry columns
  headers.push('geometry_type', 'geometry_coordinates')

  const rows = features.map(f => {
    const vals = Array.from(keys).map(k => {
      const v = f.properties?.[k]
      if (v === null || v === undefined) return ''
      const str = String(v)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    })
    vals.push(f.geometry?.type || '')
    const coordStr = f.geometry && 'coordinates' in f.geometry
      ? JSON.stringify(f.geometry.coordinates)
      : ''
    vals.push(coordStr.includes(',') ? `"${coordStr.replace(/"/g, '""')}"` : coordStr)
    return vals.join(',')
  })

  const csv = [headers.join(','), ...rows].join('\n')
  downloadString(csv, `${fileName}.csv`, 'text/csv')
}

/**
 * Save a blob as a file via download.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Download a string as a file.
 */
export function downloadString(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  downloadBlob(blob, fileName)
}
