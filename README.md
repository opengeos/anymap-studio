# AnyMap Studio

A modern GIS desktop application built with Electron that provides multi-backend mapping capabilities through [anymap-ts](https://github.com/opengeos/anymap-ts).

## Features

- **Multi-Backend Support**: Choose from 8 different mapping backends based on your needs:
  - **MapLibre GL** (Ready) - Open-source vector map rendering with GPU acceleration
  - **CesiumJS** (Coming Soon) - 3D geospatial with globe and terrain
  - **Deck.GL** (Coming Soon) - GPU-powered large-scale data visualization
  - **OpenLayers** (Coming Soon) - Feature-rich with projection support
  - **Leaflet** (Coming Soon) - Lightweight and mobile-friendly
  - **Mapbox GL** (Coming Soon) - Commercial mapping platform with globe view
  - **Kepler.gl** (Coming Soon) - Geospatial data exploration
  - **Potree** (Coming Soon) - Point cloud visualization for LiDAR

- **Layer Management**: Add, remove, reorder, and style multiple layers
- **Format Support**: GeoJSON, Shapefile, GeoTIFF/COG, PMTiles, Vector Tiles
- **Project Management**: Save and load projects in `.anymap` format
- **Modern UI**: Dark mode interface with collapsible panels

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- The `anymap-ts` library cloned as a sibling directory

### Installation

```bash
# Clone the repository
git clone https://github.com/opengeos/anymap-studio.git
cd anymap-studio

# Ensure anymap-ts is available
# The package.json expects it at ../anymap-ts

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building

```bash
# Build for production
npm run build

# Build distributable packages
npm run dist           # Current platform
npm run dist:win       # Windows
npm run dist:mac       # macOS
npm run dist:linux     # Linux
```

## Project Structure

```
anymap-studio/
├── electron/           # Electron main process
│   ├── main.ts         # Main process entry
│   └── preload.ts      # IPC bridge
├── src/
│   ├── main.tsx        # Renderer entry
│   ├── App.tsx         # Root component
│   ├── components/     # React components
│   │   ├── layout/     # AppShell, Toolbar, Sidebar, StatusBar
│   │   ├── map/        # MapCanvas, MapControls
│   │   ├── layers/     # LayerPanel, LayerItem
│   │   └── landing/    # LandingPage, BackendSelector
│   ├── backends/       # Backend abstraction layer
│   │   ├── types.ts    # IMapBackend interface
│   │   ├── capabilities.ts  # Backend capability matrix
│   │   └── adapters/   # Backend implementations
│   ├── stores/         # Zustand state management
│   └── types/          # TypeScript definitions
└── build/              # App icons
```

## Tech Stack

- **Desktop Shell**: Electron 40+
- **Build Tool**: Vite 7 + vite-plugin-electron
- **UI Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Maps**: anymap-ts

## License

MIT License - see [LICENSE](LICENSE) for details.
