import { app, BrowserWindow, dialog, ipcMain, session, type IpcMainInvokeEvent } from 'electron'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// O Chromium pode pedir MIDI como 'midi' ou 'midiSysex'; o app não envia SysEx, mas recusar trava o acesso.
const ALLOWED_PERMISSIONS = new Set(['midi', 'midiSysex'])
const MAX_PROJECT_BYTES = 20 * 1024 * 1024
const MAX_WAV_BYTES = 500 * 1024 * 1024
const PROJECT_FILTER = { name: 'Projeto SMK Studio', extensions: ['smk.json', 'json'] }

/** Só a página do próprio app (arquivo local ou servidor de dev) pode pedir permissões e chamar IPC. */
function isAppUrl(url: string | undefined): boolean {
  if (!url) return false
  const devUrl = process.env.ELECTRON_RENDERER_URL
  return url.startsWith('file://') || (!!devUrl && url.startsWith(devUrl))
}

function assertTrustedSender(event: IpcMainInvokeEvent): void {
  if (!isAppUrl(event.senderFrame?.url)) throw new Error('Chamada IPC de origem não confiável')
}

const safeName = (name: unknown): string =>
  (typeof name === 'string' ? name : 'projeto').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().slice(0, 80) || 'projeto'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#111216',
    title: 'SMK Studio',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Instrumento musical: o áudio precisa responder ao teclado sem exigir clique antes.
      autoplayPolicy: 'no-user-gesture-required'
    }
  })

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event) => event.preventDefault())

  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

function registerPermissions(): void {
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) =>
    callback(ALLOWED_PERMISSIONS.has(permission) && isAppUrl(wc.getURL()))
  )
  session.defaultSession.setPermissionCheckHandler(
    (wc, permission) => ALLOWED_PERMISSIONS.has(permission) && isAppUrl(wc?.getURL())
  )
}

function registerIpc(): void {
  ipcMain.handle('project:save', async (e, suggestedName: unknown, content: unknown) => {
    assertTrustedSender(e)
    if (typeof content !== 'string' || content.length > MAX_PROJECT_BYTES) throw new Error('Conteúdo de projeto inválido')
    const result = await dialog.showSaveDialog({
      title: 'Salvar projeto',
      defaultPath: `${safeName(suggestedName)}.smk.json`,
      filters: [PROJECT_FILTER]
    })
    if (result.canceled || !result.filePath) return null
    await writeFile(result.filePath, content, 'utf-8')
    return result.filePath
  })

  ipcMain.handle('project:open', async (e) => {
    assertTrustedSender(e)
    const result = await dialog.showOpenDialog({ title: 'Abrir projeto', properties: ['openFile'], filters: [PROJECT_FILTER] })
    const path = result.filePaths[0]
    if (result.canceled || !path) return null
    const info = await stat(path)
    if (info.size > MAX_PROJECT_BYTES) throw new Error('Arquivo grande demais para ser um projeto')
    return { path, content: await readFile(path, 'utf-8') }
  })

  ipcMain.handle('audio:saveWav', async (e, suggestedName: unknown, data: unknown) => {
    assertTrustedSender(e)
    if (!(data instanceof ArrayBuffer) || data.byteLength === 0 || data.byteLength > MAX_WAV_BYTES) {
      throw new Error('Áudio exportado inválido')
    }
    const result = await dialog.showSaveDialog({
      title: 'Exportar WAV',
      defaultPath: `${safeName(suggestedName)}.wav`,
      filters: [{ name: 'Áudio WAV', extensions: ['wav'] }]
    })
    if (result.canceled || !result.filePath) return null
    await writeFile(result.filePath, Buffer.from(data))
    return result.filePath
  })
}

app.whenReady().then(() => {
  registerPermissions()
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
