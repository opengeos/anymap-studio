import type { BackendType, IMapBackend, MapOptions } from './types'

const adapterCache = new Map<BackendType, IMapBackend>()

export async function createBackend(
  type: BackendType,
  container: HTMLElement,
  options: MapOptions = {}
): Promise<IMapBackend> {
  // Lazy load adapters to enable code splitting
  let adapter: IMapBackend

  switch (type) {
    case 'maplibre': {
      const { MapLibreAdapter } = await import('./adapters/MapLibreAdapter')
      adapter = new MapLibreAdapter()
      break
    }
    case 'cesium': {
      const { CesiumAdapter } = await import('./adapters/CesiumAdapter')
      adapter = new CesiumAdapter()
      break
    }
    case 'deckgl': {
      const { DeckGLAdapter } = await import('./adapters/DeckGLAdapter')
      adapter = new DeckGLAdapter()
      break
    }
    case 'leaflet': {
      const { LeafletAdapter } = await import('./adapters/LeafletAdapter')
      adapter = new LeafletAdapter()
      break
    }
    case 'openlayers': {
      const { OpenLayersAdapter } = await import('./adapters/OpenLayersAdapter')
      adapter = new OpenLayersAdapter()
      break
    }
    case 'mapbox': {
      const { MapboxAdapter } = await import('./adapters/MapboxAdapter')
      adapter = new MapboxAdapter()
      break
    }
    case 'keplergl': {
      const { KeplerGLAdapter } = await import('./adapters/KeplerGLAdapter')
      adapter = new KeplerGLAdapter()
      break
    }
    case 'potree': {
      const { PotreeAdapter } = await import('./adapters/PotreeAdapter')
      adapter = new PotreeAdapter()
      break
    }
    default:
      throw new Error(`Unknown backend type: ${type}`)
  }

  await adapter.initialize(container, options)
  adapterCache.set(type, adapter)

  return adapter
}

export function getBackend(type: BackendType): IMapBackend | undefined {
  return adapterCache.get(type)
}

export function destroyBackend(type: BackendType): void {
  const adapter = adapterCache.get(type)
  if (adapter) {
    adapter.destroy()
    adapterCache.delete(type)
  }
}

export function destroyAllBackends(): void {
  for (const [type] of adapterCache) {
    destroyBackend(type)
  }
}

export * from './types'
export * from './capabilities'
