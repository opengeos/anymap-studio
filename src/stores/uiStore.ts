import { create } from 'zustand'

type ViewType = 'landing' | 'map'
type ActiveTool = 'none' | 'measure-distance' | 'measure-area' | 'draw-point' | 'draw-line' | 'draw-polygon'

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
  clearMeasurement: () => set({ measureResult: null, activeTool: 'none' })
}))
