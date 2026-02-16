import { create } from 'zustand'
import type { BackendType } from '../backends/types'
import type { AnyMapProject, UnifiedLayerConfig, ViewOptions, RecentProject } from '../types/project'

export interface Bookmark {
  id: string
  name: string
  view: ViewOptions
}

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
  bookmarks: Bookmark[]

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

  // Bookmark operations
  addBookmark: (name: string) => void
  removeBookmark: (id: string) => void
  goToBookmark: (id: string) => Bookmark | undefined

  // Recent projects (persisted via localStorage)
  getRecentProjects: () => RecentProject[]
  addRecentProject: (path: string, name: string) => void

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
  bookmarks: [],

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

  addBookmark: (name) =>
    set((state) => ({
      bookmarks: [...state.bookmarks, { id: `bm-${Date.now()}`, name, view: { ...state.view } }],
      isDirty: true
    })),

  removeBookmark: (id) =>
    set((state) => ({
      bookmarks: state.bookmarks.filter(b => b.id !== id),
      isDirty: true
    })),

  goToBookmark: (id) => {
    const bm = get().bookmarks.find(b => b.id === id)
    if (bm) set({ view: { ...bm.view } })
    return bm
  },

  getRecentProjects: () => {
    try {
      const stored = localStorage.getItem('anymap-recent-projects')
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  },

  addRecentProject: (path, name) => {
    try {
      const stored = localStorage.getItem('anymap-recent-projects')
      const recent: RecentProject[] = stored ? JSON.parse(stored) : []
      const filtered = recent.filter(r => r.path !== path)
      filtered.unshift({ path, name, lastOpened: new Date().toISOString() })
      localStorage.setItem('anymap-recent-projects', JSON.stringify(filtered.slice(0, 10)))
    } catch { /* ignore */ }
  },

  loadProject: (project, filePath) => {
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
      modified: project.metadata.modified,
      bookmarks: []
    })
    if (filePath) get().addRecentProject(filePath, project.metadata.name)
  },

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
      modified: new Date().toISOString(),
      bookmarks: []
    })
}))
