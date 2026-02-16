import { useState } from 'react'
import { Layers, Database, Settings, ChevronDown, ChevronRight, Map, Bookmark, Plus, Trash2, Navigation } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { useMapStore } from '../../stores/mapStore'
import { LayerPanel } from '../layers/LayerPanel'
import { BasemapSelector } from '../common/BasemapSelector'

type PanelType = 'layers' | 'basemaps' | 'bookmarks' | 'data' | 'settings'

interface PanelConfig {
  id: PanelType
  label: string
  icon: React.ElementType
}

const panels: PanelConfig[] = [
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'basemaps', label: 'Basemaps', icon: Map },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'settings', label: 'Settings', icon: Settings }
]

export function Sidebar() {
  const { sidebarWidth, setShowSettings, coordinateFormat, setCoordinateFormat } = useUIStore()
  const { bookmarks, addBookmark, removeBookmark, goToBookmark } = useProjectStore()
  const { backend } = useMapStore()
  const [expandedPanels, setExpandedPanels] = useState<Set<PanelType>>(new Set(['layers']))
  const [newBookmarkName, setNewBookmarkName] = useState('')

  const togglePanel = (panel: PanelType) => {
    setExpandedPanels((prev) => {
      const next = new Set(prev)
      if (next.has(panel)) next.delete(panel)
      else next.add(panel)
      return next
    })
  }

  return (
    <aside
      className="flex h-full flex-col border-r border-slate-700 bg-slate-900"
      style={{ width: sidebarWidth }}
    >
      <div className="flex-1 overflow-y-auto">
        {panels.map((panel) => {
          const Icon = panel.icon
          const isExpanded = expandedPanels.has(panel.id)

          return (
            <div key={panel.id} className="border-b border-slate-700/60">
              <button
                onClick={() => togglePanel(panel.id)}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 hover:bg-slate-800/60 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                )}
                <Icon className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-200">{panel.label}</span>
              </button>

              {isExpanded && (
                <div className="pb-2">
                  {panel.id === 'layers' && <LayerPanel />}
                  {panel.id === 'basemaps' && <BasemapSelector />}
                  {panel.id === 'bookmarks' && (
                    <div className="px-4 py-3 space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Bookmark name..."
                          value={newBookmarkName}
                          onChange={e => setNewBookmarkName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newBookmarkName.trim()) {
                              addBookmark(newBookmarkName.trim())
                              setNewBookmarkName('')
                            }
                          }}
                          className="flex-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            if (newBookmarkName.trim()) {
                              addBookmark(newBookmarkName.trim())
                              setNewBookmarkName('')
                            }
                          }}
                          disabled={!newBookmarkName.trim()}
                          className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs text-white hover:bg-blue-500 disabled:opacity-40 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {bookmarks.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-2">No bookmarks yet. Save the current view.</p>
                      ) : (
                        <div className="space-y-1">
                          {bookmarks.map(bm => (
                            <div key={bm.id} className="flex items-center gap-2 rounded-md px-2.5 py-2 hover:bg-slate-800/60 group">
                              <button
                                onClick={() => {
                                  const b = goToBookmark(bm.id)
                                  if (b && backend) backend.setView({ center: b.view.center, zoom: b.view.zoom, pitch: b.view.pitch, bearing: b.view.bearing })
                                }}
                                className="flex flex-1 items-center gap-2 min-w-0 text-left"
                              >
                                <Navigation className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                                <span className="text-xs text-slate-300 truncate">{bm.name}</span>
                              </button>
                              <button
                                onClick={() => removeBookmark(bm.id)}
                                className="rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-900/30 transition-all"
                              >
                                <Trash2 className="h-3 w-3 text-slate-500 hover:text-red-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {panel.id === 'data' && (
                    <div className="px-5 py-3 text-sm text-slate-400 space-y-2.5">
                      <p>Supported formats:</p>
                      <ul className="text-xs text-slate-500 space-y-1.5 list-disc pl-4">
                        <li>GeoJSON (.geojson, .json)</li>
                        <li>Shapefile (.shp, .zip)</li>
                        <li>KML / KMZ</li>
                        <li>CSV / TSV with coordinates</li>
                        <li>Cloud Optimized GeoTIFF (COG)</li>
                        <li>PMTiles (vector tiles)</li>
                        <li>XYZ tile services</li>
                        <li>WMS / WMTS services</li>
                      </ul>
                      <p className="text-xs text-slate-500 pt-1">
                        Drag and drop files onto the map to add layers.
                      </p>
                    </div>
                  )}
                  {panel.id === 'settings' && (
                    <div className="px-5 py-3 space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-medium text-slate-400">Coordinate Format</label>
                        <select
                          value={coordinateFormat}
                          onChange={e => setCoordinateFormat(e.target.value as 'decimal' | 'dms')}
                          className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="decimal">Decimal Degrees</option>
                          <option value="dms">DMS</option>
                        </select>
                      </div>
                      <button
                        onClick={() => setShowSettings(true)}
                        className="w-full rounded-lg bg-slate-700 px-3 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-600 transition-colors"
                      >
                        All Settings...
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
