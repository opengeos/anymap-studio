# CLAUDE.md - AnyMap Studio

## Project Overview

AnyMap Studio is a modern GIS desktop application built with Electron that provides multi-backend mapping capabilities through the anymap-ts library. It aims to be a powerful desktop GIS tool like QGIS but with a modern, clean interface.

## Tech Stack

- **Desktop Shell**: Electron 40+
- **Build Tool**: Vite 7 + vite-plugin-electron
- **UI Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS v4 (with `@tailwindcss/postcss`)
- **State Management**: Zustand
- **Maps**: anymap-ts (npm package)
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
│   │   ├── tools/      # MeasureTool, DrawTool
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
- MapLibre and Cesium adapters are implemented; others are placeholders

### File Operations
- All file I/O goes through Electron IPC (`window.electronAPI`)
- Project files use `.anymap` extension (JSON format)

## Important Files

- `src/backends/adapters/MapLibreAdapter.ts` - Primary map backend
- `src/stores/projectStore.ts` - Project state (layers, view, save/load)
- `src/components/layers/LayerPanel.tsx` - Layer management + zoom-to-data
- `src/index.css` - MapLibre control styling for dark theme

## Current Status

### Implemented
- Project scaffolding with Electron + Vite + React
- Backend abstraction layer with capability matrix
- MapLibre adapter with GeoJSON, raster, PMTiles support
- Cesium 3D adapter with GeoJSON, 3D Tiles, imagery support
- Layer panel with add/remove/visibility/opacity
- Basemap selector with 4 options (preserves layers on switch)
- Project save/load (.anymap format)
- Zoom-to-data when adding layers
- Dark mode UI
- Shapefile loading (.shp, .zip) via shpjs
- Add from URL dialog (GeoJSON, COG, PMTiles, XYZ)
- Distance measurement tool (Haversine formula)
- Area measurement tool (spherical excess)
- Drawing tools (point, line, polygon)

## Remaining Tasks

### High Priority - Core GIS Features

#### Data Loading & Formats
- [ ] GeoTIFF/COG visualization with proper tile rendering
- [ ] GeoPackage (.gpkg) loading support
- [ ] KML/KMZ file loading
- [ ] CSV with coordinates (lat/lng columns)
- [ ] WMS/WMTS service connections
- [ ] WFS service connections
- [ ] PostGIS database connections
- [ ] Drag-and-drop file loading onto map

#### Layer Management
- [ ] Layer reordering via drag-and-drop
- [ ] Layer groups/folders
- [ ] Layer renaming
- [ ] Duplicate layer
- [ ] Layer context menu (right-click)
- [ ] Layer metadata/properties panel
- [ ] Layer extent info display

#### Styling & Symbology
- [ ] Style editor panel for vector layers
- [ ] Fill color picker with opacity
- [ ] Stroke color/width/style editor
- [ ] Point symbol selector (circle, square, icon)
- [ ] Categorized styling (by attribute)
- [ ] Graduated styling (numeric ranges)
- [ ] Rule-based styling
- [ ] Label configuration (field, font, halo)
- [ ] Save/load layer styles (.json)

#### Attribute Table
- [ ] View attributes in data grid
- [ ] Sort by column
- [ ] Filter/search attributes
- [ ] Select features from table (sync with map)
- [ ] Edit attribute values
- [ ] Add/remove fields
- [ ] Field calculator (expressions)
- [ ] Export selected features
- [ ] Statistics panel (for numeric fields)

### Medium Priority - Advanced Features

#### Selection & Querying
- [ ] Click to select feature
- [ ] Box select multiple features
- [ ] Polygon select
- [ ] Select by attribute (SQL-like query)
- [ ] Identify tool (click to see attributes)
- [ ] Feature info popup on hover

#### Editing & Sketching
- [ ] Edit existing feature geometry (move vertices)
- [ ] Delete features
- [ ] Split polygon
- [ ] Merge polygons
- [ ] Snapping to existing features
- [ ] Undo/redo for edits
- [ ] Save edits to file

#### Analysis Tools
- [ ] Buffer analysis
- [ ] Clip/intersection
- [ ] Union
- [ ] Dissolve
- [ ] Centroid calculation
- [ ] Voronoi/Thiessen polygons
- [ ] Heatmap generation
- [ ] Spatial join

#### Export & Print
- [ ] Export map to PNG
- [ ] Export map to PDF
- [ ] Print layout composer
- [ ] Add title, legend, scale bar, north arrow
- [ ] Export layer to GeoJSON
- [ ] Export layer to Shapefile
- [ ] Export layer to GeoPackage

### Lower Priority - Additional Backends

#### DeckGL Adapter
- [ ] Initialize deck.gl with MapLibre base
- [ ] ScatterplotLayer for large point datasets
- [ ] ArcLayer for flow visualization
- [ ] HexagonLayer for aggregation
- [ ] TripsLayer for animated paths
- [ ] GPU-accelerated rendering

#### OpenLayers Adapter
- [ ] Initialize OpenLayers map
- [ ] Support for various projections (EPSG codes)
- [ ] WMS/WMTS layer support
- [ ] Vector tile support

#### Leaflet Adapter
- [ ] Initialize Leaflet map
- [ ] GeoJSON layer support
- [ ] Marker clustering
- [ ] Lightweight alternative

#### Potree Adapter (Point Clouds)
- [ ] Load LAS/LAZ files
- [ ] Load COPC files
- [ ] Point cloud visualization
- [ ] Color by elevation/intensity/classification

### UI/UX Improvements

#### General UI
- [ ] Command palette (Ctrl+Shift+P)
- [ ] Keyboard shortcuts panel
- [ ] Customizable toolbar
- [ ] Resizable sidebar panels
- [ ] Floating/dockable panels
- [ ] Multiple map views (split screen)
- [ ] Minimap/overview map
- [ ] Full-screen mode

#### Navigation & View
- [ ] Bookmarks/saved views
- [ ] Go to coordinates dialog
- [ ] Coordinate search (geocoding)
- [ ] History (back/forward navigation)
- [ ] Rotation controls
- [ ] 3D tilt controls (for Cesium)

#### Status Bar
- [ ] Mouse coordinates (multiple formats)
- [ ] Current scale
- [ ] Current CRS/projection
- [ ] Memory/performance indicator
- [ ] Background task progress

### Project & Settings

#### Project Management
- [ ] Recent projects list on landing page
- [ ] Project templates
- [ ] Auto-save
- [ ] Project recovery (crash recovery)
- [ ] Import QGIS project (.qgz)

#### Settings & Preferences
- [ ] Settings dialog
- [ ] Default CRS selection
- [ ] Unit preferences (metric/imperial)
- [ ] Theme selection (dark/light)
- [ ] Proxy configuration
- [ ] Cache management
- [ ] API keys management (Mapbox, Cesium Ion)

### Plugin System (Future)
- [ ] Plugin architecture design
- [ ] Plugin API for adding tools
- [ ] Plugin API for adding layer types
- [ ] Plugin manager UI
- [ ] Sample plugins
