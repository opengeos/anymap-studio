import { create } from 'zustand'

type ViewType = 'landing' | 'map'

interface UIState {
  view: ViewType
  sidebarOpen: boolean
  sidebarWidth: number
  layerPanelOpen: boolean
  statusBarVisible: boolean
  darkMode: boolean

  setView: (view: ViewType) => void
  setSidebarOpen: (open: boolean) => void
  setSidebarWidth: (width: number) => void
  setLayerPanelOpen: (open: boolean) => void
  setStatusBarVisible: (visible: boolean) => void
  setDarkMode: (dark: boolean) => void
  toggleSidebar: () => void
  toggleLayerPanel: () => void
}

export const useUIStore = create<UIState>((set) => ({
  view: 'landing',
  sidebarOpen: true,
  sidebarWidth: 280,
  layerPanelOpen: true,
  statusBarVisible: true,
  darkMode: true,

  setView: (view) => set({ view }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setLayerPanelOpen: (layerPanelOpen) => set({ layerPanelOpen }),
  setStatusBarVisible: (statusBarVisible) => set({ statusBarVisible }),
  setDarkMode: (darkMode) => set({ darkMode }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleLayerPanel: () => set((state) => ({ layerPanelOpen: !state.layerPanelOpen }))
}))
