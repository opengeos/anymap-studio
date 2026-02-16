import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Search, MapPin, Save, Home, ZoomIn, ZoomOut,
  Ruler, Square, Circle, Minus, Pentagon, Layers, Settings,
  Download, Table2, Palette, Maximize2, Eye, EyeOff, Navigation
} from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { useMapStore } from '../../stores/mapStore'

interface Command {
  id: string
  label: string
  shortcut?: string
  icon: React.ElementType
  category: string
  action: () => void
}

export function CommandPalette() {
  const { showCommandPalette, setShowCommandPalette, setActiveTool, clearMeasurement, setShowGoToCoordinates, setShowExportDialog, setShowSettings, activeTool } = useUIStore()
  const { layers, selectedLayerId } = useProjectStore()
  const { backend, zoom } = useMapStore()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const commands: Command[] = useMemo(() => {
    const cmds: Command[] = [
      // Navigation
      {
        id: 'goto-coords',
        label: 'Go to Coordinates',
        shortcut: 'Ctrl+G',
        icon: MapPin,
        category: 'Navigation',
        action: () => { setShowGoToCoordinates(true); setShowCommandPalette(false) }
      },
      {
        id: 'zoom-in',
        label: 'Zoom In',
        shortcut: 'Ctrl+=',
        icon: ZoomIn,
        category: 'Navigation',
        action: () => {
          if (backend) {
            const view = backend.getView()
            backend.setView({ ...view, zoom: view.zoom + 1 })
          }
          setShowCommandPalette(false)
        }
      },
      {
        id: 'zoom-out',
        label: 'Zoom Out',
        shortcut: 'Ctrl+-',
        icon: ZoomOut,
        category: 'Navigation',
        action: () => {
          if (backend) {
            const view = backend.getView()
            backend.setView({ ...view, zoom: Math.max(0, view.zoom - 1) })
          }
          setShowCommandPalette(false)
        }
      },
      {
        id: 'fit-bounds',
        label: 'Fit to All Layers',
        shortcut: 'Ctrl+0',
        icon: Maximize2,
        category: 'Navigation',
        action: () => {
          // Fit to all layer bounds
          setShowCommandPalette(false)
        }
      },
      {
        id: 'reset-north',
        label: 'Reset North',
        icon: Navigation,
        category: 'Navigation',
        action: () => {
          if (backend) {
            const view = backend.getView()
            backend.setView({ ...view, bearing: 0, pitch: 0 })
          }
          setShowCommandPalette(false)
        }
      },

      // Tools
      {
        id: 'measure-distance',
        label: activeTool === 'measure-distance' ? 'Stop Measuring Distance' : 'Measure Distance',
        shortcut: 'M',
        icon: Ruler,
        category: 'Tools',
        action: () => {
          if (activeTool === 'measure-distance') clearMeasurement()
          else setActiveTool('measure-distance')
          setShowCommandPalette(false)
        }
      },
      {
        id: 'measure-area',
        label: activeTool === 'measure-area' ? 'Stop Measuring Area' : 'Measure Area',
        icon: Square,
        category: 'Tools',
        action: () => {
          if (activeTool === 'measure-area') clearMeasurement()
          else setActiveTool('measure-area')
          setShowCommandPalette(false)
        }
      },
      {
        id: 'identify',
        label: 'Identify Features',
        shortcut: 'I',
        icon: Eye,
        category: 'Tools',
        action: () => {
          setActiveTool(activeTool === 'identify' ? 'none' : 'identify')
          setShowCommandPalette(false)
        }
      },
      {
        id: 'draw-point',
        label: 'Draw Point',
        icon: Circle,
        category: 'Tools',
        action: () => { setActiveTool('draw-point'); setShowCommandPalette(false) }
      },
      {
        id: 'draw-line',
        label: 'Draw Line',
        icon: Minus,
        category: 'Tools',
        action: () => { setActiveTool('draw-line'); setShowCommandPalette(false) }
      },
      {
        id: 'draw-polygon',
        label: 'Draw Polygon',
        icon: Pentagon,
        category: 'Tools',
        action: () => { setActiveTool('draw-polygon'); setShowCommandPalette(false) }
      },

      // Project
      {
        id: 'save',
        label: 'Save Project',
        shortcut: 'Ctrl+S',
        icon: Save,
        category: 'Project',
        action: () => { setShowCommandPalette(false) }
      },
      {
        id: 'go-home',
        label: 'Go to Start Page',
        icon: Home,
        category: 'Project',
        action: () => { setShowCommandPalette(false) }
      },
      {
        id: 'export',
        label: 'Export Map / Data',
        shortcut: 'Ctrl+E',
        icon: Download,
        category: 'Export',
        action: () => { setShowExportDialog(true); setShowCommandPalette(false) }
      },

      // View
      {
        id: 'toggle-sidebar',
        label: 'Toggle Sidebar',
        shortcut: 'Ctrl+B',
        icon: Layers,
        category: 'View',
        action: () => { useUIStore.getState().toggleSidebar(); setShowCommandPalette(false) }
      },
      {
        id: 'settings',
        label: 'Open Settings',
        shortcut: 'Ctrl+,',
        icon: Settings,
        category: 'View',
        action: () => { setShowSettings(true); setShowCommandPalette(false) }
      }
    ]

    // Add layer-specific commands
    if (selectedLayerId) {
      const selectedLayer = layers.find(l => l.id === selectedLayerId)
      if (selectedLayer) {
        cmds.push({
          id: 'attr-table',
          label: `Open Attribute Table: ${selectedLayer.name}`,
          shortcut: 'Ctrl+T',
          icon: Table2,
          category: 'Layer',
          action: () => {
            useUIStore.getState().setShowAttributeTable(true, selectedLayerId)
            setShowCommandPalette(false)
          }
        })
        cmds.push({
          id: 'style-editor',
          label: `Edit Style: ${selectedLayer.name}`,
          icon: Palette,
          category: 'Layer',
          action: () => {
            useUIStore.getState().setShowStyleEditor(true, selectedLayerId)
            setShowCommandPalette(false)
          }
        })
        cmds.push({
          id: 'toggle-visibility',
          label: `Toggle Visibility: ${selectedLayer.name}`,
          icon: selectedLayer.visible ? EyeOff : Eye,
          category: 'Layer',
          action: () => {
            useProjectStore.getState().toggleLayerVisibility(selectedLayerId)
            if (backend) backend.updateLayer(selectedLayerId, { visible: !selectedLayer.visible })
            setShowCommandPalette(false)
          }
        })
      }
    }

    return cmds
  }, [activeTool, selectedLayerId, layers, backend, zoom])

  const filteredCommands = useMemo(() => {
    if (!query) return commands
    const lower = query.toLowerCase()
    return commands.filter(c =>
      c.label.toLowerCase().includes(lower) ||
      c.category.toLowerCase().includes(lower)
    )
  }, [query, commands])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (showCommandPalette) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [showCommandPalette])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const item = listRef.current.children[selectedIndex] as HTMLElement
      if (item) item.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!showCommandPalette) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action()
      }
    } else if (e.key === 'Escape') {
      setShowCommandPalette(false)
    }
  }

  // Group commands by category
  const grouped: { category: string; commands: Command[] }[] = []
  const seen = new Set<string>()
  for (const cmd of filteredCommands) {
    if (!seen.has(cmd.category)) {
      seen.add(cmd.category)
      grouped.push({ category: cmd.category, commands: [] })
    }
    grouped.find(g => g.category === cmd.category)?.commands.push(cmd)
  }

  let flatIndex = -1

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 pt-[15vh]" onClick={() => setShowCommandPalette(false)}>
      <div className="w-full max-w-xl rounded-2xl bg-slate-800 border border-slate-600 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-700 px-4 py-3">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
          />
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {grouped.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No matching commands</div>
          ) : (
            grouped.map(group => (
              <div key={group.category}>
                <div className="px-4 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {group.category}
                </div>
                {group.commands.map(cmd => {
                  flatIndex++
                  const idx = flatIndex
                  const Icon = cmd.icon
                  return (
                    <button
                      key={cmd.id}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        idx === selectedIndex
                          ? 'bg-blue-600/20 text-slate-100'
                          : 'text-slate-300 hover:bg-slate-700/50'
                      }`}
                      onClick={() => cmd.action()}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <Icon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="flex-1 text-left truncate">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-400 font-mono">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
