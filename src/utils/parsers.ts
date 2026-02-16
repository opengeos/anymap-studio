/**
 * File parsing utilities for KML, CSV, and other formats.
 */

/**
 * Parse KML string into GeoJSON.
 */
export function parseKML(kmlString: string): GeoJSON.FeatureCollection {
  const parser = new DOMParser()
  const doc = parser.parseFromString(kmlString, 'text/xml')

  const features: GeoJSON.Feature[] = []

  // Parse Placemarks
  const placemarks = doc.getElementsByTagName('Placemark')
  for (let i = 0; i < placemarks.length; i++) {
    const placemark = placemarks[i]
    const feature = parsePlacemark(placemark)
    if (feature) features.push(feature)
  }

  return { type: 'FeatureCollection', features }
}

function parsePlacemark(placemark: Element): GeoJSON.Feature | null {
  const properties: Record<string, unknown> = {}

  // Extract name
  const name = placemark.getElementsByTagName('name')[0]
  if (name?.textContent) properties.name = name.textContent

  // Extract description
  const description = placemark.getElementsByTagName('description')[0]
  if (description?.textContent) properties.description = description.textContent

  // Extract ExtendedData
  const simpleData = placemark.getElementsByTagName('SimpleData')
  for (let i = 0; i < simpleData.length; i++) {
    const attr = simpleData[i].getAttribute('name')
    if (attr) properties[attr] = simpleData[i].textContent
  }

  const data = placemark.getElementsByTagName('Data')
  for (let i = 0; i < data.length; i++) {
    const attr = data[i].getAttribute('name')
    const value = data[i].getElementsByTagName('value')[0]
    if (attr && value?.textContent) properties[attr] = value.textContent
  }

  // Extract geometry
  const geometry = parseGeometry(placemark)
  if (!geometry) return null

  return { type: 'Feature', properties, geometry }
}

function parseGeometry(element: Element): GeoJSON.Geometry | null {
  // Point
  const point = element.getElementsByTagName('Point')[0]
  if (point) {
    const coords = parseCoordinateString(
      point.getElementsByTagName('coordinates')[0]?.textContent || ''
    )
    if (coords.length > 0) {
      return { type: 'Point', coordinates: coords[0] }
    }
  }

  // LineString
  const line = element.getElementsByTagName('LineString')[0]
  if (line) {
    const coords = parseCoordinateString(
      line.getElementsByTagName('coordinates')[0]?.textContent || ''
    )
    if (coords.length > 0) {
      return { type: 'LineString', coordinates: coords }
    }
  }

  // Polygon
  const polygon = element.getElementsByTagName('Polygon')[0]
  if (polygon) {
    const rings: number[][] [] = []
    const outerBoundary = polygon.getElementsByTagName('outerBoundaryIs')[0]
    if (outerBoundary) {
      const coords = parseCoordinateString(
        outerBoundary.getElementsByTagName('coordinates')[0]?.textContent || ''
      )
      if (coords.length > 0) rings.push(coords)
    }
    const innerBoundaries = polygon.getElementsByTagName('innerBoundaryIs')
    for (let i = 0; i < innerBoundaries.length; i++) {
      const coords = parseCoordinateString(
        innerBoundaries[i].getElementsByTagName('coordinates')[0]?.textContent || ''
      )
      if (coords.length > 0) rings.push(coords)
    }
    if (rings.length > 0) {
      return { type: 'Polygon', coordinates: rings }
    }
  }

  // MultiGeometry
  const multi = element.getElementsByTagName('MultiGeometry')[0]
  if (multi) {
    const geometries: GeoJSON.Geometry[] = []
    for (let i = 0; i < multi.children.length; i++) {
      const geom = parseGeometry(multi.children[i] as Element)
      if (geom) geometries.push(geom)
    }
    if (geometries.length > 0) {
      return { type: 'GeometryCollection', geometries }
    }
  }

  return null
}

function parseCoordinateString(coordString: string): number[][] {
  return coordString
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tuple) => {
      const parts = tuple.split(',').map(Number)
      // KML is lng,lat,alt
      return parts.length >= 2 ? [parts[0], parts[1], ...(parts[2] !== undefined ? [parts[2]] : [])] : []
    })
    .filter((c) => c.length >= 2 && !isNaN(c[0]) && !isNaN(c[1]))
}

/**
 * Parse KMZ (zipped KML) buffer into GeoJSON.
 * KMZ is a ZIP file containing doc.kml
 */
export async function parseKMZ(buffer: ArrayBuffer): Promise<GeoJSON.FeatureCollection> {
  // KMZ files are ZIP archives. We need to extract the KML from the ZIP.
  // Use the browser's built-in DecompressionStream for simple ZIP handling
  // or a minimal ZIP parser
  const bytes = new Uint8Array(buffer)

  // Find KML content in ZIP - look for PK header and file entries
  const kmlContent = extractKMLFromZip(bytes)
  if (!kmlContent) {
    throw new Error('No KML file found in KMZ archive')
  }

  return parseKML(kmlContent)
}

function extractKMLFromZip(data: Uint8Array): string | null {
  // Minimal ZIP parser - find local file headers and extract .kml files
  let offset = 0
  const decoder = new TextDecoder()

  while (offset < data.length - 4) {
    // Look for local file header signature (PK\x03\x04)
    if (data[offset] === 0x50 && data[offset + 1] === 0x4b &&
        data[offset + 2] === 0x03 && data[offset + 3] === 0x04) {

      const compressionMethod = data[offset + 8] | (data[offset + 9] << 8)
      const compressedSize = data[offset + 18] | (data[offset + 19] << 8) |
                             (data[offset + 20] << 16) | (data[offset + 21] << 24)
      const fileNameLength = data[offset + 26] | (data[offset + 27] << 8)
      const extraFieldLength = data[offset + 28] | (data[offset + 29] << 8)

      const fileName = decoder.decode(data.slice(offset + 30, offset + 30 + fileNameLength))
      const dataStart = offset + 30 + fileNameLength + extraFieldLength

      if (fileName.toLowerCase().endsWith('.kml') && compressionMethod === 0) {
        // Stored (not compressed)
        const fileData = data.slice(dataStart, dataStart + compressedSize)
        return decoder.decode(fileData)
      }

      offset = dataStart + compressedSize
    } else {
      offset++
    }
  }

  return null
}

/**
 * Parse CSV string with coordinate columns into GeoJSON.
 */
export function parseCSV(
  csvString: string,
  options: {
    latColumn?: string
    lngColumn?: string
    delimiter?: string
  } = {}
): GeoJSON.FeatureCollection {
  const delimiter = options.delimiter || detectDelimiter(csvString)
  const lines = csvString.trim().split('\n')

  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row')
  }

  const headers = parseCSVRow(lines[0], delimiter)

  // Auto-detect lat/lng columns
  const latCol = options.latColumn || detectLatColumn(headers)
  const lngCol = options.lngColumn || detectLngColumn(headers)

  if (!latCol || !lngCol) {
    throw new Error(
      `Could not detect coordinate columns. Found headers: ${headers.join(', ')}. ` +
      `Please specify latitude and longitude column names.`
    )
  }

  const latIdx = headers.indexOf(latCol)
  const lngIdx = headers.indexOf(lngCol)

  const features: GeoJSON.Feature[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVRow(lines[i], delimiter)
    if (values.length < Math.max(latIdx, lngIdx) + 1) continue

    const lat = parseFloat(values[latIdx])
    const lng = parseFloat(values[lngIdx])

    if (isNaN(lat) || isNaN(lng)) continue

    const properties: Record<string, unknown> = {}
    headers.forEach((header, idx) => {
      if (idx !== latIdx && idx !== lngIdx) {
        const val = values[idx]
        const num = Number(val)
        properties[header] = val !== '' && !isNaN(num) && val === String(num) ? num : val
      }
    })

    // Also include lat/lng in properties
    properties[latCol] = lat
    properties[lngCol] = lng

    features.push({
      type: 'Feature',
      properties,
      geometry: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    })
  }

  if (features.length === 0) {
    throw new Error('No valid coordinate rows found in CSV')
  }

  return { type: 'FeatureCollection', features }
}

function parseCSVRow(row: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < row.length; i++) {
    const char = row[i]
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function detectDelimiter(csv: string): string {
  const firstLine = csv.split('\n')[0]
  const commas = (firstLine.match(/,/g) || []).length
  const tabs = (firstLine.match(/\t/g) || []).length
  const semicolons = (firstLine.match(/;/g) || []).length

  if (tabs > commas && tabs > semicolons) return '\t'
  if (semicolons > commas) return ';'
  return ','
}

const LAT_PATTERNS = ['latitude', 'lat', 'y', 'lat_dd', 'latitude_dd', 'point_y', 'lat_d']
const LNG_PATTERNS = ['longitude', 'lng', 'lon', 'long', 'x', 'lng_dd', 'longitude_dd', 'point_x', 'lon_d']

function detectLatColumn(headers: string[]): string | undefined {
  const lower = headers.map(h => h.toLowerCase().trim())
  for (const pattern of LAT_PATTERNS) {
    const idx = lower.indexOf(pattern)
    if (idx !== -1) return headers[idx]
  }
  return undefined
}

function detectLngColumn(headers: string[]): string | undefined {
  const lower = headers.map(h => h.toLowerCase().trim())
  for (const pattern of LNG_PATTERNS) {
    const idx = lower.indexOf(pattern)
    if (idx !== -1) return headers[idx]
  }
  return undefined
}

/**
 * Detect file type from extension.
 */
export function detectFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const typeMap: Record<string, string> = {
    geojson: 'geojson',
    json: 'geojson',
    kml: 'kml',
    kmz: 'kmz',
    csv: 'csv',
    tsv: 'csv',
    shp: 'shapefile',
    zip: 'shapefile',
    tif: 'geotiff',
    tiff: 'geotiff',
    gpkg: 'geopackage',
  }
  return typeMap[ext] || 'unknown'
}

/**
 * Get CSV column headers for user selection.
 */
export function getCSVHeaders(csvString: string): string[] {
  const delimiter = detectDelimiter(csvString)
  const firstLine = csvString.split('\n')[0]
  return parseCSVRow(firstLine, delimiter)
}

/**
 * Auto-detect lat/lng column names from CSV headers.
 */
export function autoDetectCoordinateColumns(headers: string[]): { lat?: string; lng?: string } {
  return {
    lat: detectLatColumn(headers),
    lng: detectLngColumn(headers)
  }
}
