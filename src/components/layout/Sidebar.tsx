import { useState } from 'react'
import { Layers, Database, Settings, ChevronDown, ChevronRight, Map } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { LayerPanel } from '../layers/LayerPanel'
import { BasemapSelector } from '../common/BasemapSelector'

type PanelType = 'layers' | 'basemaps' | 'data' | 'settings'

interface PanelConfig {
  id: PanelType
  label: string
  icon: React.ElementType
}

const panels: PanelConfig[] = [
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'basemaps', label: 'Basemaps', icon: Map },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'settings', label: 'Settings', icon: Settings }
]

export function Sidebar() {
  const { sidebarWidth, setShowSettings, coordinateFormat, setCoordinateFormat } = useUIStore()
  const [expandedPanels, setExpandedPanels] = useState<Set<PanelType>>(new Set(['layers']))

  const togglePanel = (panel: PanelType) => {
    setExpandedPanels((prev) => {
      const next = new Set(prev)
      if (next.has(panel)) {
        next.delete(panel)
      } else {
        next.add(panel)
      }
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
            <div key={panel.id} className="border-b border-slate-700">
              <button
                onClick={() => togglePanel(panel.id)}
                className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-800"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
                <Icon className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-200">{panel.label}</span>
              </button>

              {isExpanded && (
                <div className="pb-3">
                  {panel.id === 'layers' && <LayerPanel />}
                  {panel.id === 'basemaps' && <BasemapSelector />}
                  {panel.id === 'data' && (
                    <div className="px-4 py-3 text-sm text-slate-400 space-y-2">
                      <p>Supported formats:</p>
                      <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
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
                    <div className="px-4 py-3 space-y-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-400">Coordinate Format</label>
                        <select
                          value={coordinateFormat}
                          onChange={e => setCoordinateFormat(e.target.value as 'decimal' | 'dms')}
                          className="w-full rounded-md border border-slate-600 bg-slate-700 px-2 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="decimal">Decimal Degrees</option>
                          <option value="dms">DMS</option>
                        </select>
                      </div>
                      <button
                        onClick={() => setShowSettings(true)}
                        className="w-full rounded-lg bg-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-600"
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
