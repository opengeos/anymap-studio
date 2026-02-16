import { Toolbar } from './Toolbar'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { MapCanvas } from '../map/MapCanvas'
import { useUIStore } from '../../stores/uiStore'

export function AppShell() {
  const { sidebarOpen, statusBarVisible } = useUIStore()

  return (
    <div className="flex h-full w-full flex-col bg-background">
      <Toolbar />

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar />}

        <main className="relative flex-1 overflow-hidden">
          <MapCanvas />
        </main>
      </div>

      {statusBarVisible && <StatusBar />}
    </div>
  )
}
