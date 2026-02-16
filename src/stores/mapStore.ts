import { create } from 'zustand'
import type { BackendType, IMapBackend } from '../backends/types'
import type { ViewOptions } from '../types/project'

interface MapState {
  backend: IMapBackend | null
  backendType: BackendType
  isLoading: boolean
  error: string | null
  cursorPosition: { lng: number; lat: number } | null
  zoom: number

  setBackend: (backend: IMapBackend | null) => void
  setBackendType: (type: BackendType) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setCursorPosition: (pos: { lng: number; lat: number } | null) => void
  setZoom: (zoom: number) => void
  setView: (view: ViewOptions) => void
}

export const useMapStore = create<MapState>((set, get) => ({
  backend: null,
  backendType: 'maplibre',
  isLoading: false,
  error: null,
  cursorPosition: null,
  zoom: 2,

  setBackend: (backend) => set({ backend }),
  setBackendType: (backendType) => set({ backendType }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setCursorPosition: (cursorPosition) => set({ cursorPosition }),
  setZoom: (zoom) => set({ zoom }),
  setView: (view) => {
    const { backend } = get()
    if (backend) {
      backend.setView(view)
      set({ zoom: view.zoom })
    }
  }
}))
