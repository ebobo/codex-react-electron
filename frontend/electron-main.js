import { app, BrowserWindow, ipcMain } from 'electron'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { Buffer } from 'node:buffer'

// Use the CommonJS build of libredwg-web for better Node compatibility
const require = createRequire(import.meta.url)
const { createModule, LibreDwg, Dwg_File_Type } = require('@mlightcad/libredwg-web')

const __dirname = dirname(fileURLToPath(import.meta.url))

let mainWindow
let dwgInfo = null

function filterDbByLayers(db, layerSet) {
  const filtered = structuredClone(db)
  filtered.entities = db.entities.filter((e) => layerSet.has(e.layer))
  filtered.tables.BLOCK_RECORD.entries = db.tables.BLOCK_RECORD.entries.map((b) => ({
    ...b,
    entities: b.entities.filter((e) => layerSet.has(e.layer)),
  }))
  return filtered
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      contextIsolation: true,
    },
  })

  await mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
}

app.whenReady().then(createWindow)

ipcMain.handle('load-dwg', async (_evt, buffer) => {
  // Ensure the input is a Uint8Array that libredwg can consume
  const bytes = Buffer.isBuffer(buffer)
    ? buffer
    : new Uint8Array(buffer)

  const wasmPath = path.join(
    __dirname,
    'node_modules',
    '@mlightcad',
    'libredwg-web',
    'wasm',
    'libredwg-web.wasm',
  )
  const wasmInstance = await createModule({
    locateFile: (p) => (p.endsWith('.wasm') ? wasmPath : p),
  })
  const libredwg = LibreDwg.createByWasmInstance(wasmInstance)
  const dwgData = libredwg.dwg_read_data(bytes, Dwg_File_Type.DWG)
  const db = libredwg.convert(dwgData)
  libredwg.dwg_free(dwgData)
  dwgInfo = { libredwg, db }

  const usedLayers = new Set()
  db.entities.forEach((e) => usedLayers.add(e.layer))
  db.tables.BLOCK_RECORD.entries.forEach((b) =>
    b.entities.forEach((e) => usedLayers.add(e.layer)),
  )
  const layers = db.tables.LAYER.entries
    .map((l) => l.name)
    .filter((n) => usedLayers.has(n))

  const svg = libredwg.dwg_to_svg(filterDbByLayers(db, new Set(layers)))
  return { layers, svg }
})

ipcMain.handle('render-dwg', async (_evt, layers) => {
  if (!dwgInfo) return null
  const { libredwg, db } = dwgInfo
  return libredwg.dwg_to_svg(filterDbByLayers(db, new Set(layers)))
})
