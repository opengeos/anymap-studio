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
  const { sidebarOpen, statusBarVisible } = useUIStore()

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useUIStore.getState()

      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        // Still allow Escape
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

      // Escape to cancel tool
      if (e.key === 'Escape') {
        state.setShowCommandPalette(false)
        state.setShowGoToCoordinates(false)
        state.setShowExportDialog(false)
        state.setShowSettings(false)
        state.setShowStyleEditor(false)
        state.setShowAttributeTable(false)
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

        <main className="relative flex-1 overflow-hidden">
          <MapCanvas />
          <MeasureTool />
          <DrawTool />
          <AttributeTable />
        </main>
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
