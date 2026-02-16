import { app, BrowserWindow, Menu, dialog, ipcMain, MenuItemConstructorOptions } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

let mainWindow: BrowserWindow | null = null
let mapIsOpen = false

/**
 * Creates the application menu with File menu items.
 */
function createMenu(): void {
  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = [
    // macOS app menu
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const }
      ]
    }] : []),
    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu:new-project')
          }
        },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            await handleOpenProject()
          }
        },
        { type: 'separator' },
        {
          id: 'save-project',
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          enabled: mapIsOpen,
          click: () => {
            mainWindow?.webContents.send('menu:save-project')
          }
        },
        {
          id: 'save-project-as',
          label: 'Save Project As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          enabled: mapIsOpen,
          click: () => {
            mainWindow?.webContents.send('menu:save-project-as')
          }
        },
        { type: 'separator' },
        {
          id: 'close-project',
          label: 'Close Project',
          accelerator: 'CmdOrCtrl+W',
          enabled: mapIsOpen,
          click: () => {
            mainWindow?.webContents.send('menu:close-project')
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' as const } : { role: 'quit' as const }
      ]
    },
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' as const },
          { role: 'delete' as const },
          { role: 'selectAll' as const },
        ] : [
          { role: 'delete' as const },
          { type: 'separator' as const },
          { role: 'selectAll' as const }
        ])
      ]
    },
    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const }
      ]
    },
    // Map menu
    {
      label: 'Map',
      submenu: [
        {
          label: 'Add Layer',
          submenu: [
            {
              label: 'GeoJSON File...',
              click: () => {
                mainWindow?.webContents.send('menu:add-layer', 'geojson')
              }
            },
            {
              label: 'Shapefile...',
              click: () => {
                mainWindow?.webContents.send('menu:add-layer', 'shapefile')
              }
            },
            {
              label: 'GeoTIFF/COG...',
              click: () => {
                mainWindow?.webContents.send('menu:add-layer', 'geotiff')
              }
            },
            {
              label: 'PMTiles...',
              click: () => {
                mainWindow?.webContents.send('menu:add-layer', 'pmtiles')
              }
            },
            { type: 'separator' },
            {
              label: 'From URL...',
              click: () => {
                mainWindow?.webContents.send('menu:add-layer', 'url')
              }
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Zoom to Fit',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow?.webContents.send('menu:zoom-fit')
          }
        },
        {
          label: 'Switch Backend...',
          click: () => {
            mainWindow?.webContents.send('menu:switch-backend')
          }
        }
      ]
    },
    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const },
          { type: 'separator' as const },
          { role: 'window' as const }
        ] : [
          { role: 'close' as const }
        ])
      ]
    },
    // Help menu
    {
      role: 'help' as const,
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            const { shell } = await import('electron')
            await shell.openExternal('https://github.com/opengeos/anymap-studio')
          }
        },
        {
          label: 'Report Issue',
          click: async () => {
            const { shell } = await import('electron')
            await shell.openExternal('https://github.com/opengeos/anymap-studio/issues')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

/**
 * Updates menu item enabled states based on project open state.
 *
 * @param isOpen - Whether a project is currently open.
 */
function updateMenuState(isOpen: boolean): void {
  mapIsOpen = isOpen
  createMenu()
}

/**
 * Handles the Open Project menu action - shows dialog and sends file to renderer.
 */
async function handleOpenProject(): Promise<void> {
  if (!mainWindow) return

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Project',
    filters: [
      { name: 'AnyMap Files', extensions: ['anymap'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  })

  if (result.canceled || !result.filePaths[0]) return

  const filePath = result.filePaths[0]
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    mainWindow.webContents.send('menu:open-project', filePath, content)
  } catch (error) {
    dialog.showErrorBox('Error Opening File', `Failed to read file: ${(error as Error).message}`)
  }
}

/**
 * Sets up IPC handlers for file operations.
 */
function setupIpcHandlers(): void {
  // Handle open dialog request from renderer
  ipcMain.handle('file:open-dialog', async (_event, options?: { filters?: { name: string, extensions: string[] }[] }) => {
    if (!mainWindow) return { canceled: true }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open File',
      filters: options?.filters || [
        { name: 'GeoJSON Files', extensions: ['geojson', 'json'] },
        { name: 'Shapefiles', extensions: ['shp', 'zip'] },
        { name: 'GeoTIFF Files', extensions: ['tif', 'tiff'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || !result.filePaths[0]) {
      return { canceled: true }
    }

    const filePath = result.filePaths[0]
    try {
      const stats = fs.statSync(filePath)
      const isBinary = ['.shp', '.zip', '.tif', '.tiff', '.gpkg'].some(ext => filePath.toLowerCase().endsWith(ext))

      if (isBinary) {
        const buffer = fs.readFileSync(filePath)
        return { canceled: false, filePath, buffer: buffer.toString('base64'), isBinary: true }
      } else {
        const content = fs.readFileSync(filePath, 'utf-8')
        return { canceled: false, filePath, content, isBinary: false }
      }
    } catch (error) {
      dialog.showErrorBox('Error Opening File', `Failed to read file: ${(error as Error).message}`)
      return { canceled: true }
    }
  })

  // Handle project open dialog
  ipcMain.handle('project:open-dialog', async () => {
    if (!mainWindow) return { canceled: true }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open Project',
      filters: [
        { name: 'AnyMap Files', extensions: ['anymap'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || !result.filePaths[0]) {
      return { canceled: true }
    }

    const filePath = result.filePaths[0]
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return { canceled: false, filePath, content }
    } catch (error) {
      dialog.showErrorBox('Error Opening File', `Failed to read file: ${(error as Error).message}`)
      return { canceled: true }
    }
  })

  // Handle save dialog request from renderer
  ipcMain.handle('file:save-dialog', async (_event, defaultPath?: string) => {
    if (!mainWindow) return { canceled: true }

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Project As',
      defaultPath: defaultPath || 'untitled.anymap',
      filters: [
        { name: 'AnyMap Files', extensions: ['anymap'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { canceled: true }
    }

    return { canceled: false, filePath: result.filePath }
  })

  // Handle file write request from renderer
  ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8')
    } catch (error) {
      dialog.showErrorBox('Error Saving File', `Failed to save file: ${(error as Error).message}`)
      throw error
    }
  })

  // Handle file read request from renderer
  ipcMain.handle('file:read', async (_event, filePath: string, asBinary?: boolean) => {
    try {
      if (asBinary) {
        const buffer = fs.readFileSync(filePath)
        return { content: buffer.toString('base64'), isBinary: true }
      } else {
        const content = fs.readFileSync(filePath, 'utf-8')
        return { content, isBinary: false }
      }
    } catch (error) {
      throw error
    }
  })

  // Handle menu state update from renderer
  ipcMain.on('app:update-menu-state', (_event, isOpen: boolean) => {
    updateMenuState(isOpen)
  })

  // Save-before-leave dialog when user clicks Home with unsaved changes
  ipcMain.handle('dialog:save-before-leave', async () => {
    if (!mainWindow) return 'cancel'
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Unsaved changes',
      message: 'Save project before going to the start page?',
      buttons: ['Save', "Don't Save", 'Cancel'],
      defaultId: 0,
      cancelId: 2,
    })
    const choice = result.response
    if (choice === 0) return 'save'
    if (choice === 1) return 'dontSave'
    return 'cancel'
  })

  // Export save dialog
  ipcMain.handle('file:export-save-dialog', async (_event, defaultPath?: string, filters?: { name: string, extensions: string[] }[]) => {
    if (!mainWindow) return { canceled: true }

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export',
      defaultPath: defaultPath || 'export',
      filters: filters || [
        { name: 'PNG Image', extensions: ['png'] },
        { name: 'GeoJSON', extensions: ['geojson'] },
        { name: 'CSV', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { canceled: true }
    }

    return { canceled: false, filePath: result.filePath }
  })

  // Confirm dialog
  ipcMain.handle('dialog:confirm', async (_event, message: string, title?: string) => {
    if (!mainWindow) return false
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: title || 'Confirm',
      message,
      buttons: ['Yes', 'No'],
      defaultId: 0,
      cancelId: 1,
    })
    return result.response === 0
  })
}

/**
 * Creates the main application window.
 */
function createWindow(): void {
  const preloadPath = path.join(__dirname, 'preload.mjs')
  const iconPath = VITE_DEV_SERVER_URL
    ? path.join(__dirname, '../build/icon.png')
    : path.join(__dirname, '../dist/icon.png')

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: iconPath,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false
    }
  })

  // Forward renderer console messages to terminal for debugging
  mainWindow.webContents.on('console-message', (_event, _level, message) => {
    if (message.startsWith('[')) {
      console.log('[Renderer]', message)
    }
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createMenu()
  setupIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
