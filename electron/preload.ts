import { contextBridge, ipcRenderer } from 'electron'

/**
 * Exposes a secure API to the renderer process.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // Menu event listeners (main -> renderer)
  onNewProject: (callback: () => void) => {
    ipcRenderer.removeAllListeners('menu:new-project')
    ipcRenderer.on('menu:new-project', () => callback())
  },
  onOpenProject: (callback: (filePath: string, content: string) => void) => {
    ipcRenderer.removeAllListeners('menu:open-project')
    ipcRenderer.on('menu:open-project', (_event, filePath: string, content: string) => {
      callback(filePath, content)
    })
  },
  onSaveProject: (callback: () => void) => {
    ipcRenderer.removeAllListeners('menu:save-project')
    ipcRenderer.on('menu:save-project', () => callback())
  },
  onSaveProjectAs: (callback: () => void) => {
    ipcRenderer.removeAllListeners('menu:save-project-as')
    ipcRenderer.on('menu:save-project-as', () => callback())
  },
  onCloseProject: (callback: () => void) => {
    ipcRenderer.removeAllListeners('menu:close-project')
    ipcRenderer.on('menu:close-project', () => callback())
  },
  onAddLayer: (callback: (type: string) => void) => {
    ipcRenderer.removeAllListeners('menu:add-layer')
    ipcRenderer.on('menu:add-layer', (_event, type: string) => callback(type))
  },
  onZoomFit: (callback: () => void) => {
    ipcRenderer.removeAllListeners('menu:zoom-fit')
    ipcRenderer.on('menu:zoom-fit', () => callback())
  },
  onSwitchBackend: (callback: () => void) => {
    ipcRenderer.removeAllListeners('menu:switch-backend')
    ipcRenderer.on('menu:switch-backend', () => callback())
  },

  // File operations (renderer -> main)
  showOpenDialog: (options?: { filters?: { name: string, extensions: string[] }[] }) =>
    ipcRenderer.invoke('file:open-dialog', options),
  showProjectOpenDialog: () =>
    ipcRenderer.invoke('project:open-dialog'),
  showSaveDialog: (defaultPath?: string) =>
    ipcRenderer.invoke('file:save-dialog', defaultPath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('file:write', filePath, content),
  readFile: (filePath: string, asBinary?: boolean) =>
    ipcRenderer.invoke('file:read', filePath, asBinary),

  // Dialogs
  showSaveBeforeLeaveDialog: () =>
    ipcRenderer.invoke('dialog:save-before-leave'),
  showConfirmDialog: (message: string, title?: string) =>
    ipcRenderer.invoke('dialog:confirm', message, title),

  // Menu state management
  updateMenuState: (projectIsOpen: boolean) => {
    ipcRenderer.send('app:update-menu-state', projectIsOpen)
  }
})
