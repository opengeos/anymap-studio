import { useEffect } from 'react'
import { Toolbar } from './Toolbar'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { MapCanvas } from '../map/MapCanvas'
import { MeasureTool } from '../tools/MeasureTool'
import { DrawTool } from '../tools/DrawTool'
import { AttributeTable } from '../layers/AttributeTable'
import { StyleEditor } from '../layers/StyleEditor'
import { GoToCoordinates } from '../common/GoToCoordinates'
import { CommandPalette } from '../common/CommandPalette'
import { ExportDialog } from '../common/ExportDialog'
import { SettingsPanel } from '../common/SettingsPanel'
import { useUIStore } from '../../stores/uiStore'

export function AppShell() {
  const { sidebarOpen, statusBarVisible, showAttributeTable } = useUIStore()

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useUIStore.getState()

      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        if (e.key === 'Escape') {
          state.setShowCommandPalette(false)
          state.setShowGoToCoordinates(false)
          state.setShowExportDialog(false)
          state.setShowSettings(false)
          state.setShowStyleEditor(false)
          if (state.activeTool !== 'none') {
            state.setActiveTool('none')
          }
        }
        return
      }

      // Command palette: Ctrl+Shift+P
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        state.setShowCommandPalette(!state.showCommandPalette)
        return
      }

      // Go to coordinates: Ctrl+G
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault()
        state.setShowGoToCoordinates(true)
        return
      }

      // Export: Ctrl+E
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault()
        state.setShowExportDialog(true)
        return
      }

      // Toggle sidebar: Ctrl+B
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        state.toggleSidebar()
        return
      }

      // Settings: Ctrl+,
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        state.setShowSettings(true)
        return
      }

      // Escape to cancel tool or close panels
      if (e.key === 'Escape') {
        if (state.showCommandPalette) { state.setShowCommandPalette(false); return }
        if (state.showGoToCoordinates) { state.setShowGoToCoordinates(false); return }
        if (state.showExportDialog) { state.setShowExportDialog(false); return }
        if (state.showSettings) { state.setShowSettings(false); return }
        if (state.showStyleEditor) { state.setShowStyleEditor(false); return }
        if (state.showAttributeTable) { state.setShowAttributeTable(false); return }
        if (state.activeTool !== 'none') {
          if (state.activeTool.startsWith('measure')) {
            state.clearMeasurement()
          } else {
            state.setActiveTool('none')
          }
        }
        return
      }

      // Single-key shortcuts (no modifiers)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'i' || e.key === 'I') {
          state.setActiveTool(state.activeTool === 'identify' ? 'none' : 'identify')
          return
        }
        if (e.key === 'm' || e.key === 'M') {
          if (state.activeTool === 'measure-distance') {
            state.clearMeasurement()
          } else {
            state.setActiveTool('measure-distance')
          }
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-full w-full flex-col bg-background">
      <Toolbar />

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar />}

        {/* Main content area: map + attribute table stacked vertically */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="relative flex-1 overflow-hidden">
            <MapCanvas />
            <MeasureTool />
            <DrawTool />
          </main>

          {/* Attribute table docked at the bottom */}
          {showAttributeTable && <AttributeTable />}
        </div>
      </div>

      {statusBarVisible && <StatusBar />}

      {/* Modal overlays */}
      <GoToCoordinates />
      <CommandPalette />
      <ExportDialog />
      <SettingsPanel />
      <StyleEditor />
    </div>
  )
}
