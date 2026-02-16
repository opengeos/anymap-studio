import { X, Settings } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'

export function SettingsPanel() {
  const {
    showSettings, setShowSettings,
    coordinateFormat, setCoordinateFormat,
    statusBarVisible, setStatusBarVisible,
    sidebarWidth, setSidebarWidth,
    darkMode
  } = useUIStore()

  if (!showSettings) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSettings(false)}>
      <div className="w-full max-w-md rounded-2xl bg-slate-800 border border-slate-600 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-slate-100">Settings</h3>
          </div>
          <button onClick={() => setShowSettings(false)} className="rounded p-1 hover:bg-slate-700">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Display */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-200 uppercase tracking-wider">Display</h4>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Coordinate Format</label>
                <select
                  value={coordinateFormat}
                  onChange={e => setCoordinateFormat(e.target.value as 'decimal' | 'dms')}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="decimal">Decimal Degrees (DD)</option>
                  <option value="dms">Degrees Minutes Seconds (DMS)</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">Show Status Bar</label>
                <button
                  onClick={() => setStatusBarVisible(!statusBarVisible)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${statusBarVisible ? 'bg-blue-600' : 'bg-slate-600'}`}
                >
                  <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${statusBarVisible ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Sidebar Width: {sidebarWidth}px
                </label>
                <input
                  type="range"
                  min="200" max="450" step="10"
                  value={sidebarWidth}
                  onChange={e => setSidebarWidth(parseInt(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-600"
                />
              </div>
            </div>
          </div>

          {/* Theme */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-200 uppercase tracking-wider">Theme</h4>
            <div className="flex gap-3">
              <div className={`flex-1 rounded-lg border-2 p-3 cursor-pointer transition-all ${
                darkMode ? 'border-blue-500 bg-slate-700' : 'border-slate-600'
              }`}>
                <div className="h-8 rounded bg-slate-900 mb-2" />
                <span className="text-xs text-slate-300">Dark</span>
              </div>
              <div className={`flex-1 rounded-lg border-2 p-3 cursor-not-allowed opacity-50 transition-all border-slate-600`}>
                <div className="h-8 rounded bg-slate-100 mb-2" />
                <span className="text-xs text-slate-400">Light (coming soon)</span>
              </div>
            </div>
          </div>

          {/* About */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-200 uppercase tracking-wider">About</h4>
            <div className="text-sm text-slate-400 space-y-1">
              <div>AnyMap Studio v0.1.0</div>
              <div>Built with Electron, React, and MapLibre GL</div>
              <div className="text-xs text-slate-500">MIT License</div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-200 uppercase tracking-wider">Keyboard Shortcuts</h4>
            <div className="space-y-2 text-sm">
              {[
                ['Ctrl+Shift+P', 'Command Palette'],
                ['Ctrl+G', 'Go to Coordinates'],
                ['Ctrl+E', 'Export Map / Data'],
                ['Ctrl+S', 'Save Project'],
                ['Ctrl+B', 'Toggle Sidebar'],
                ['Ctrl+,', 'Settings'],
                ['I', 'Identify Tool'],
                ['M', 'Measure Distance'],
                ['Escape', 'Cancel Tool'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-slate-400">{desc}</span>
                  <kbd className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300 font-mono">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-slate-700">
          <button
            onClick={() => setShowSettings(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
