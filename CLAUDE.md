# CLAUDE.md - AnyMap Studio

## Project Overview

AnyMap Studio is a modern GIS desktop application built with Electron that provides multi-backend mapping capabilities through the anymap-ts library. It aims to be a powerful desktop GIS tool like QGIS but with a modern, clean interface.

## Tech Stack

- **Desktop Shell**: Electron 40+
- **Build Tool**: Vite 7 + vite-plugin-electron
- **UI Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS v4 (with `@tailwindcss/postcss`)
- **State Management**: Zustand
- **Maps**: anymap-ts (file dependency at `../anymap-ts`)
- **Icons**: Lucide React

## Project Structure

```
anymap-studio/
├── electron/           # Electron main process
│   ├── main.ts         # Main process, menus, IPC handlers
│   └── preload.ts      # IPC bridge to renderer
├── src/
│   ├── main.tsx        # React entry point
│   ├── App.tsx         # Root component
│   ├── index.css       # Global styles + MapLibre dark theme
│   ├── components/
│   │   ├── layout/     # AppShell, Toolbar, Sidebar, StatusBar
│   │   ├── map/        # MapCanvas, MapControls
│   │   ├── layers/     # LayerPanel, LayerItem
│   │   ├── landing/    # LandingPage, BackendSelector
│   │   └── common/     # BasemapSelector, shared components
│   ├── backends/
│   │   ├── types.ts    # IMapBackend interface
│   │   ├── capabilities.ts  # Backend capability matrix
│   │   ├── index.ts    # Backend factory with lazy loading
│   │   └── adapters/   # MapLibreAdapter, CesiumAdapter, etc.
│   ├── stores/         # Zustand stores (ui, map, project)
│   └── types/          # TypeScript definitions
└── build/              # App icons
```

## Key Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run dist     # Build distributable packages
```

## Coding Conventions

### Styling
- Use Tailwind CSS utility classes directly in components
- Dark theme colors: `slate-900` (bg), `slate-700` (borders), `slate-400` (icons), `slate-200`/`slate-300` (text)
- Selected items: blue accent with `border-blue-500`, `bg-blue-500/10`, `ring-1 ring-blue-500/50`
- Rounded corners: `rounded-lg` for cards/buttons, `rounded-md` for smaller elements

### Components
- Functional components with TypeScript
- Use Lucide React for icons
- State management via Zustand stores (not prop drilling)

### Backend Abstraction
- All map backends implement `IMapBackend` interface
- Use `createBackend()` factory for lazy loading
- Only MapLibre adapter is fully implemented; others are placeholders

### File Operations
- All file I/O goes through Electron IPC (`window.electronAPI`)
- Project files use `.anymap` extension (JSON format)

## Important Files

- `src/backends/adapters/MapLibreAdapter.ts` - Primary map backend
- `src/stores/projectStore.ts` - Project state (layers, view, save/load)
- `src/components/layers/LayerPanel.tsx` - Layer management + zoom-to-data
- `src/index.css` - MapLibre control styling for dark theme

## Current Status

### Implemented (Phase 1-2)
- Project scaffolding with Electron + Vite + React
- Backend abstraction layer with capability matrix
- MapLibre adapter with GeoJSON support
- Layer panel with add/remove/visibility/opacity
- Basemap selector with 4 options
- Project save/load (.anymap format)
- Zoom-to-data when adding layers
- Dark mode UI

### Not Yet Implemented
- Cesium, DeckGL, and other backend adapters
- Shapefile, GeoTIFF/COG, PMTiles loading
- Drawing/editing tools
- Measurement tools
- Attribute table
- Print/export to PNG/PDF
