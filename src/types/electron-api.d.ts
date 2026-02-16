export interface FileDialogResult {
  canceled: boolean
  filePath?: string
  content?: string
  buffer?: string
  isBinary?: boolean
}

export interface FileReadResult {
  content: string
  isBinary: boolean
}

export interface ElectronAPI {
  platform: NodeJS.Platform

  // Menu event listeners
  onNewProject: (callback: () => void) => void
  onOpenProject: (callback: (filePath: string, content: string) => void) => void
  onSaveProject: (callback: () => void) => void
  onSaveProjectAs: (callback: () => void) => void
  onCloseProject: (callback: () => void) => void
  onAddLayer: (callback: (type: string) => void) => void
  onZoomFit: (callback: () => void) => void
  onSwitchBackend: (callback: () => void) => void

  // File operations
  showOpenDialog: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<FileDialogResult>
  showProjectOpenDialog: () => Promise<FileDialogResult>
  showSaveDialog: (defaultPath?: string) => Promise<{ canceled: boolean; filePath?: string }>
  writeFile: (filePath: string, content: string) => Promise<void>
  readFile: (filePath: string, asBinary?: boolean) => Promise<FileReadResult>

  // Dialogs
  showSaveBeforeLeaveDialog: () => Promise<'save' | 'dontSave' | 'cancel'>
  showConfirmDialog: (message: string, title?: string) => Promise<boolean>

  // Menu state
  updateMenuState: (projectIsOpen: boolean) => void
}

export const electronAPI: ElectronAPI
