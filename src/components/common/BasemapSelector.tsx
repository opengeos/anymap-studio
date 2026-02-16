import { useState } from 'react'
import { Check } from 'lucide-react'
import { useMapStore } from '../../stores/mapStore'
import type { MapLibreAdapter } from '../../backends/adapters/MapLibreAdapter'
import maplibregl from 'maplibre-gl'

interface BasemapOption {
  id: string
  name: string
  url: string
}

const basemaps: BasemapOption[] = [
  { id: 'liberty', name: 'OpenFreeMap Liberty', url: 'https://tiles.openfreemap.org/styles/liberty' },
  { id: 'bright', name: 'OpenFreeMap Bright', url: 'https://tiles.openfreemap.org/styles/bright' },
  { id: 'positron', name: 'OpenFreeMap Positron', url: 'https://tiles.openfreemap.org/styles/positron' },
  { id: 'carto-dark-matter', name: 'CartoDB Dark Matter', url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
  { id: 'carto-positron', name: 'CartoDB Positron', url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json' },
  { id: 'carto-voyager', name: 'CartoDB Voyager', url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json' }
]

export function BasemapSelector() {
  const { backend } = useMapStore()
  const [selectedId, setSelectedId] = useState('liberty')
  const [isChanging, setIsChanging] = useState(false)

  const handleBasemapChange = async (basemap: BasemapOption) => {
    if (!backend || backend.type !== 'maplibre' || isChanging) return
    const map = backend.getNativeMap() as maplibregl.Map | null
    if (!map) return

    setIsChanging(true)
    setSelectedId(basemap.id)

    const currentLayers = [...backend.getLayers()]
    ;(backend as MapLibreAdapter).clearLayerTracking()
    map.setStyle(basemap.url)

    map.once('style.load', async () => {
      for (const layer of currentLayers) {
        try { await (backend as MapLibreAdapter).addLayer(layer) }
        catch (e) { console.error('Failed to re-add layer after basemap change:', e) }
      }
      setIsChanging(false)
    })
  }

  return (
    <div className="flex flex-col gap-1.5 px-4 py-2">
      {basemaps.map((basemap) => {
        const isSelected = selectedId === basemap.id
        return (
          <button
            key={basemap.id}
            onClick={() => handleBasemapChange(basemap)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
              isSelected
                ? 'bg-blue-500/10 text-blue-300'
                : 'text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <div className={`flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0 ${
              isSelected ? 'bg-blue-500' : 'border border-slate-600'
            }`}>
              {isSelected && <Check className="h-3 w-3 text-white" />}
            </div>
            <span className="text-[13px]">{basemap.name}</span>
          </button>
        )
      })}
    </div>
  )
}
