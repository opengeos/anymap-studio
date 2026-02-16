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
  {
    id: 'liberty',
    name: 'OpenFreeMap Liberty',
    url: 'https://tiles.openfreemap.org/styles/liberty'
  },
  {
    id: 'bright',
    name: 'OpenFreeMap Bright',
    url: 'https://tiles.openfreemap.org/styles/bright'
  },
  {
    id: 'positron',
    name: 'OpenFreeMap Positron',
    url: 'https://tiles.openfreemap.org/styles/positron'
  },
  {
    id: 'demotiles',
    name: 'MapLibre Demo',
    url: 'https://demotiles.maplibre.org/style.json'
  }
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

    // Save current layers from the adapter
    const currentLayers = [...backend.getLayers()]

    // Clear internal layer tracking before style change
    ;(backend as MapLibreAdapter).clearLayerTracking()

    // Change the style
    map.setStyle(basemap.url)

    // Wait for style to load, then re-add layers
    map.once('style.load', async () => {
      // Re-add all layers
      for (const layer of currentLayers) {
        try {
          await (backend as MapLibreAdapter).addLayer(layer)
        } catch (e) {
          console.error('Failed to re-add layer after basemap change:', e)
        }
      }
      setIsChanging(false)
    })
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      {basemaps.map((basemap) => {
        const isSelected = selectedId === basemap.id
        return (
          <button
            key={basemap.id}
            onClick={() => handleBasemapChange(basemap)}
            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
              isSelected
                ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/50'
                : 'border-slate-700 bg-slate-800/30 hover:bg-slate-800/60 hover:border-slate-600'
            }`}
          >
            <div className={`h-8 w-12 rounded flex-shrink-0 flex items-center justify-center ${
              isSelected ? 'bg-blue-500/20' : 'bg-slate-700'
            }`}>
              {isSelected && <Check className="h-4 w-4 text-blue-400" />}
            </div>
            <span className={`text-sm ${isSelected ? 'text-blue-300 font-medium' : 'text-slate-300'}`}>
              {basemap.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
