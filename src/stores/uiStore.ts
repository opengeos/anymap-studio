import { create } from 'zustand'

type ViewType = 'landing' | 'map'
type ActiveTool = 'none' | 'measure-distance' | 'measure-area' | 'draw-point' | 'draw-line' | 'draw-polygon' | 'identify' | 'select'

interface MeasureResult {
  type: 'distance' | 'area'
  value: number
  unit: string
  points: [number, number][]
}

interface UIState {
  view: ViewType
  sidebarOpen: boolean
  sidebarWidth: number
  layerPanelOpen: boolean
  statusBarVisible: boolean
  darkMode: boolean
  activeTool: ActiveTool
  measureResult: MeasureResult | null

  // Dialog states
  showCommandPalette: boolean
  showGoToCoordinates: boolean
  showExportDialog: boolean
  showSettings: boolean
  showAttributeTable: boolean
  attributeTableLayerId: string | null
  showStyleEditor: boolean
  styleEditorLayerId: string | null
  coordinateFormat: 'decimal' | 'dms'

  setView: (view: ViewType) => void
  setSidebarOpen: (open: boolean) => void
  setSidebarWidth: (width: number) => void
  setLayerPanelOpen: (open: boolean) => void
  setStatusBarVisible: (visible: boolean) => void
  setDarkMode: (dark: boolean) => void
  toggleSidebar: () => void
  toggleLayerPanel: () => void
  setActiveTool: (tool: ActiveTool) => void
  setMeasureResult: (result: MeasureResult | null) => void
  clearMeasurement: () => void

  // Dialog actions
  setShowCommandPalette: (show: boolean) => void
  setShowGoToCoordinates: (show: boolean) => void
  setShowExportDialog: (show: boolean) => void
  setShowSettings: (show: boolean) => void
  setShowAttributeTable: (show: boolean, layerId?: string | null) => void
  setShowStyleEditor: (show: boolean, layerId?: string | null) => void
  setCoordinateFormat: (format: 'decimal' | 'dms') => void
}

export const useUIStore = create<UIState>((set) => ({
  view: 'landing',
  sidebarOpen: true,
  sidebarWidth: 280,
  layerPanelOpen: true,
  statusBarVisible: true,
  darkMode: true,
  activeTool: 'none',
  measureResult: null,

  showCommandPalette: false,
  showGoToCoordinates: false,
  showExportDialog: false,
  showSettings: false,
  showAttributeTable: false,
  attributeTableLayerId: null,
  showStyleEditor: false,
  styleEditorLayerId: null,
  coordinateFormat: 'decimal',

  setView: (view) => set({ view }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setLayerPanelOpen: (layerPanelOpen) => set({ layerPanelOpen }),
  setStatusBarVisible: (statusBarVisible) => set({ statusBarVisible }),
  setDarkMode: (darkMode) => set({ darkMode }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleLayerPanel: () => set((state) => ({ layerPanelOpen: !state.layerPanelOpen })),
  setActiveTool: (activeTool) => set({ activeTool }),
  setMeasureResult: (measureResult) => set({ measureResult }),
  clearMeasurement: () => set({ measureResult: null, activeTool: 'none' }),

  setShowCommandPalette: (showCommandPalette) => set({ showCommandPalette }),
  setShowGoToCoordinates: (showGoToCoordinates) => set({ showGoToCoordinates }),
  setShowExportDialog: (showExportDialog) => set({ showExportDialog }),
  setShowSettings: (showSettings) => set({ showSettings }),
  setShowAttributeTable: (show, layerId) => set({
    showAttributeTable: show,
    attributeTableLayerId: layerId !== undefined ? layerId : null
  }),
  setShowStyleEditor: (show, layerId) => set({
    showStyleEditor: show,
    styleEditorLayerId: layerId !== undefined ? layerId : null
  }),
  setCoordinateFormat: (coordinateFormat) => set({ coordinateFormat })
}))
