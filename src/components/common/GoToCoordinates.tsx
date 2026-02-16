import { useState } from 'react'
import { X, MapPin } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useMapStore } from '../../stores/mapStore'

export function GoToCoordinates() {
  const { showGoToCoordinates, setShowGoToCoordinates } = useUIStore()
  const { backend } = useMapStore()
  const [lng, setLng] = useState('')
  const [lat, setLat] = useState('')
  const [zoom, setZoom] = useState('12')
  const [error, setError] = useState('')

  if (!showGoToCoordinates) return null

  const handleGo = () => {
    const lngNum = parseFloat(lng)
    const latNum = parseFloat(lat)
    const zoomNum = parseFloat(zoom)

    if (isNaN(lngNum) || isNaN(latNum)) {
      setError('Please enter valid coordinates')
      return
    }

    if (lngNum < -180 || lngNum > 180) {
      setError('Longitude must be between -180 and 180')
      return
    }

    if (latNum < -90 || latNum > 90) {
      setError('Latitude must be between -90 and 90')
      return
    }

    if (backend) {
      backend.setView({
        center: [lngNum, latNum],
        zoom: isNaN(zoomNum) ? 12 : zoomNum
      })
    }

    setError('')
    setShowGoToCoordinates(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleGo()
    if (e.key === 'Escape') setShowGoToCoordinates(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowGoToCoordinates(false)}>
      <div className="w-full max-w-sm rounded-2xl bg-slate-800 border border-slate-600 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-slate-100">Go to Coordinates</h3>
          </div>
          <button onClick={() => setShowGoToCoordinates(false)} className="rounded p-1 hover:bg-slate-700">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Longitude</label>
              <input
                type="text"
                value={lng}
                onChange={e => setLng(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="-73.985428"
                autoFocus
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Latitude</label>
              <input
                type="text"
                value={lat}
                onChange={e => setLat(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="40.748817"
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Zoom Level</label>
            <input
              type="text"
              value={zoom}
              onChange={e => setZoom(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="12"
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700">
          <button
            onClick={() => setShowGoToCoordinates(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleGo}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Go
          </button>
        </div>
      </div>
    </div>
  )
}
