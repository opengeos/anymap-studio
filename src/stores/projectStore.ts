import { create } from 'zustand'
import type { BackendType } from '../backends/types'
import type { AnyMapProject, UnifiedLayerConfig, ViewOptions } from '../types/project'

interface ProjectState {
  name: string
  description: string
  filePath: string | null
  isDirty: boolean
  backend: BackendType
  view: ViewOptions
  layers: UnifiedLayerConfig[]
  selectedLayerId: string | null
  created: string
  modified: string

  // Actions
  setName: (name: string) => void
  setDescription: (description: string) => void
  setFilePath: (path: string | null) => void
  setDirty: (dirty: boolean) => void
  setBackend: (backend: BackendType) => void
  setView: (view: ViewOptions) => void

  // Layer operations
  addLayer: (layer: UnifiedLayerConfig) => void
  removeLayer: (id: string) => void
  updateLayer: (id: string, updates: Partial<UnifiedLayerConfig>) => void
  reorderLayers: (sourceIndex: number, targetIndex: number) => void
  setSelectedLayer: (id: string | null) => void
  toggleLayerVisibility: (id: string) => void
  setLayerOpacity: (id: string, opacity: number) => void

  // Project operations
  loadProject: (project: AnyMapProject, filePath?: string) => void
  exportProject: () => AnyMapProject
  reset: () => void
}

const defaultView: ViewOptions = {
  center: [0, 0],
  zoom: 2,
  pitch: 0,
  bearing: 0
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  name: 'Untitled Project',
  description: '',
  filePath: null,
  isDirty: false,
  backend: 'maplibre',
  view: defaultView,
  layers: [],
  selectedLayerId: null,
  created: new Date().toISOString(),
  modified: new Date().toISOString(),

  setName: (name) => set({ name, isDirty: true, modified: new Date().toISOString() }),
  setDescription: (description) => set({ description, isDirty: true, modified: new Date().toISOString() }),
  setFilePath: (filePath) => set({ filePath }),
  setDirty: (isDirty) => set({ isDirty }),
  setBackend: (backend) => set({ backend, isDirty: true, modified: new Date().toISOString() }),
  setView: (view) => set({ view, isDirty: true, modified: new Date().toISOString() }),

  addLayer: (layer) =>
    set((state) => ({
      layers: [...state.layers, layer],
      isDirty: true,
      modified: new Date().toISOString()
    })),

  removeLayer: (id) =>
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== id),
      selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId,
      isDirty: true,
      modified: new Date().toISOString()
    })),

  updateLayer: (id, updates) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      isDirty: true,
      modified: new Date().toISOString()
    })),

  reorderLayers: (sourceIndex, targetIndex) =>
    set((state) => {
      const layers = [...state.layers]
      const [removed] = layers.splice(sourceIndex, 1)
      layers.splice(targetIndex, 0, removed)
      return { layers, isDirty: true, modified: new Date().toISOString() }
    }),

  setSelectedLayer: (selectedLayerId) => set({ selectedLayerId }),

  toggleLayerVisibility: (id) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
      isDirty: true,
      modified: new Date().toISOString()
    })),

  setLayerOpacity: (id, opacity) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, opacity } : l)),
      isDirty: true,
      modified: new Date().toISOString()
    })),

  loadProject: (project, filePath) =>
    set({
      name: project.metadata.name,
      description: project.metadata.description || '',
      filePath: filePath || null,
      isDirty: false,
      backend: project.backend,
      view: project.view,
      layers: project.layers,
      selectedLayerId: null,
      created: project.metadata.created,
      modified: project.metadata.modified
    }),

  exportProject: () => {
    const state = get()
    return {
      version: '1.0.0',
      backend: state.backend,
      view: state.view,
      layers: state.layers,
      metadata: {
        name: state.name,
        description: state.description || undefined,
        created: state.created,
        modified: new Date().toISOString()
      }
    }
  },

  reset: () =>
    set({
      name: 'Untitled Project',
      description: '',
      filePath: null,
      isDirty: false,
      backend: 'maplibre',
      view: defaultView,
      layers: [],
      selectedLayerId: null,
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    })
}))
