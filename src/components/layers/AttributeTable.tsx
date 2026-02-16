import { useState, useMemo, useEffect, useCallback } from 'react'
import { X, ArrowUp, ArrowDown, Search, BarChart3, Download } from 'lucide-react'
import maplibregl from 'maplibre-gl'
import { useUIStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { useMapStore } from '../../stores/mapStore'
import { getPropertyKeys, getFeatureRows, calculateFieldStats } from '../../utils/geo'
import { exportToCSV } from '../../utils/export'

export function AttributeTable() {
  const { attributeTableLayerId, setShowAttributeTable } = useUIStore()
  const { layers } = useProjectStore()
  const { backend } = useMapStore()
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [filterText, setFilterText] = useState('')
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [statsColumn, setStatsColumn] = useState<string | null>(null)

  const layer = layers.find(l => l.id === attributeTableLayerId)

  if (!layer || layer.type !== 'geojson' || !layer.source.data) {
    return (
      <div className="flex flex-col border-t border-slate-600 bg-slate-900" style={{ height: 260 }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <span className="text-sm font-medium text-slate-300">Attribute Table</span>
          <button onClick={() => setShowAttributeTable(false)} className="rounded-md p-1 hover:bg-slate-700">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
          No vector layer selected or layer has no data.
        </div>
      </div>
    )
  }

  const geojson = layer.source.data as GeoJSON.GeoJSON
  const columns = getPropertyKeys(geojson)
  const allRows = getFeatureRows(geojson)

  const filteredRows = filterText
    ? allRows.filter(row =>
        Object.values(row.properties).some(v =>
          String(v).toLowerCase().includes(filterText.toLowerCase())
        )
      )
    : allRows

  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows
    return [...filteredRows].sort((a, b) => {
      const aVal = a.properties[sortColumn]
      const bVal = b.properties[sortColumn]
      if (aVal === bVal) return 0
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      const cmp = typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal))
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [filteredRows, sortColumn, sortDirection])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleRowSelect = (id: number, e: React.MouseEvent) => {
    setSelectedRows(prev => {
      const next = new Set(prev)
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        if (next.has(id)) next.delete(id)
        else next.add(id)
      } else {
        if (next.has(id) && next.size === 1) next.clear()
        else { next.clear(); next.add(id) }
      }
      return next
    })
  }

  // Sync selected features to map highlight
  const highlightSelectedOnMap = useCallback((ids: Set<number>) => {
    if (!backend || !layer) return
    const map = backend.getNativeMap() as maplibregl.Map | null
    if (!map) return

    const highlightSourceId = `${layer.id}-highlight-source`
    const highlightLineId = `${layer.id}-highlight-line`

    if (ids.size === 0) {
      if (map.getLayer(highlightLineId)) map.removeLayer(highlightLineId)
      if (map.getSource(highlightSourceId)) map.removeSource(highlightSourceId)
      return
    }

    if (geojson.type !== 'FeatureCollection') return
    const selectedFeatures = geojson.features.filter((_, i) => ids.has(i))
    const highlightGeoJSON: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: selectedFeatures }

    if (map.getSource(highlightSourceId)) {
      (map.getSource(highlightSourceId) as maplibregl.GeoJSONSource).setData(highlightGeoJSON)
    } else {
      map.addSource(highlightSourceId, { type: 'geojson', data: highlightGeoJSON })
    }

    if (!map.getLayer(highlightLineId)) {
      map.addLayer({
        id: highlightLineId,
        type: 'line',
        source: highlightSourceId,
        paint: { 'line-color': '#fbbf24', 'line-width': 3, 'line-opacity': 0.9 }
      })
    }
  }, [backend, layer, geojson])

  useEffect(() => {
    highlightSelectedOnMap(selectedRows)
    return () => {
      if (!backend || !layer) return
      const map = backend.getNativeMap() as maplibregl.Map | null
      if (!map) return
      const hlLineId = `${layer.id}-highlight-line`
      const hlSrcId = `${layer.id}-highlight-source`
      if (map.getLayer(hlLineId)) map.removeLayer(hlLineId)
      if (map.getSource(hlSrcId)) map.removeSource(hlSrcId)
    }
  }, [selectedRows, highlightSelectedOnMap])

  const stats = useMemo(() => {
    if (!statsColumn) return null
    const values = allRows
      .map(r => r.properties[statsColumn])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v))
    if (values.length === 0) return null
    return calculateFieldStats(values)
  }, [statsColumn, allRows])

  const handleExport = () => {
    if (geojson.type === 'FeatureCollection') {
      const features = selectedRows.size > 0
        ? geojson.features.filter((_, i) => selectedRows.has(i))
        : geojson.features
      exportToCSV(features, layer.name)
    }
  }

  return (
    <div className="flex flex-col border-t border-slate-600 bg-slate-900" style={{ height: 280 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-700 bg-slate-800/80 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-slate-200">
            {layer.name}
          </h3>
          <span className="text-xs text-slate-500">
            {sortedRows.length} of {allRows.length} features
            {selectedRows.size > 0 && ` · ${selectedRows.size} selected`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Filter..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              className="h-7 w-44 rounded-md border border-slate-600 bg-slate-700 pl-8 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
            title="Export to CSV"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            onClick={() => setShowAttributeTable(false)}
            className="rounded-md p-1 hover:bg-slate-700 transition-colors"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-800">
            <tr>
              <th className="w-12 px-3 py-2.5 text-left font-medium text-slate-400 border-b border-slate-700">#</th>
              {columns.map(col => (
                <th
                  key={col}
                  className="min-w-[120px] cursor-pointer px-4 py-2.5 text-left font-medium text-slate-400 border-b border-slate-700 hover:bg-slate-700/50 select-none"
                  onClick={() => handleSort(col)}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{col}</span>
                    {sortColumn === col && (
                      sortDirection === 'asc'
                        ? <ArrowUp className="h-3 w-3 text-blue-400 flex-shrink-0" />
                        : <ArrowDown className="h-3 w-3 text-blue-400 flex-shrink-0" />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setStatsColumn(statsColumn === col ? null : col) }}
                      className="ml-auto rounded p-0.5 hover:bg-slate-600 flex-shrink-0 opacity-0 group-hover:opacity-100"
                      title="Statistics"
                    >
                      <BarChart3 className="h-3 w-3 text-slate-500" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="min-w-[90px] px-4 py-2.5 text-left font-medium text-slate-400 border-b border-slate-700">
                Geometry
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr
                key={row.id}
                className={`cursor-pointer transition-colors ${
                  selectedRows.has(row.id)
                    ? 'bg-blue-500/15 text-slate-100'
                    : 'hover:bg-slate-800/60 text-slate-300'
                }`}
                onClick={(e) => handleRowSelect(row.id, e)}
              >
                <td className="px-3 py-2 text-slate-500 border-b border-slate-800/60">{row.id + 1}</td>
                {columns.map(col => (
                  <td key={col} className="max-w-[220px] truncate px-4 py-2 border-b border-slate-800/60">
                    {row.properties[col] !== null && row.properties[col] !== undefined
                      ? String(row.properties[col])
                      : <span className="text-slate-600 italic">null</span>
                    }
                  </td>
                ))}
                <td className="px-4 py-2 text-slate-500 border-b border-slate-800/60">
                  {row.geometry?.type || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Statistics bar */}
      {stats && statsColumn && (
        <div className="flex items-center gap-5 border-t border-slate-700 bg-slate-800/60 px-5 py-2 text-xs text-slate-400 flex-shrink-0">
          <span className="font-semibold text-slate-300">{statsColumn}</span>
          <span>Count: {stats.count}</span>
          <span>Min: {stats.min.toFixed(2)}</span>
          <span>Max: {stats.max.toFixed(2)}</span>
          <span>Mean: {stats.mean.toFixed(2)}</span>
          <span>Median: {stats.median.toFixed(2)}</span>
          <span>Sum: {stats.sum.toFixed(2)}</span>
          <span>StdDev: {stats.stdDev.toFixed(2)}</span>
          <button onClick={() => setStatsColumn(null)} className="ml-auto text-slate-500 hover:text-slate-300">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
