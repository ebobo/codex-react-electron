import { useEffect, useState, useRef } from 'react'
import { createModule, LibreDwg, Dwg_File_Type } from '@mlightcad/libredwg-web'
import wasmUrl from '../node_modules/@mlightcad/libredwg-web/wasm/libredwg-web.wasm?url'

export default function DwgViewer({ file }) {
  const [svg, setSvg] = useState(null)
  const [dbInfo, setDbInfo] = useState(null)
  const [layers, setLayers] = useState([])
  const [visibleLayers, setVisibleLayers] = useState(new Set())
  const [zoom, setZoom] = useState(1)
  const selectAllRef = useRef(null)

  useEffect(() => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const wasmInstance = await createModule({
        locateFile: (path) => (path.endsWith('.wasm') ? wasmUrl : path),
      })
      const libredwg = LibreDwg.createByWasmInstance(wasmInstance)
      const dwgData = libredwg.dwg_read_data(reader.result, Dwg_File_Type.DWG)
      const db = libredwg.convert(dwgData)
      libredwg.dwg_free(dwgData)
      setDbInfo({ libredwg, db })
      const layerNames = db.tables.LAYER.entries.map((l) => l.name)
      setLayers(layerNames)
      setVisibleLayers(new Set(layerNames))
    }
    reader.readAsArrayBuffer(file)
  }, [file])

  useEffect(() => {
    if (!dbInfo) return
    const { libredwg, db } = dbInfo
    const filtered = structuredClone(db)
    filtered.entities = db.entities.filter((e) => visibleLayers.has(e.layer))
    filtered.tables.BLOCK_RECORD.entries = db.tables.BLOCK_RECORD.entries.map((b) => ({
      ...b,
      entities: b.entities.filter((e) => visibleLayers.has(e.layer)),
    }))
    const svgStr = libredwg.dwg_to_svg(filtered)
    setSvg(svgStr)
  }, [dbInfo, visibleLayers])

  useEffect(() => {
    if (!selectAllRef.current) return
    selectAllRef.current.indeterminate =
      visibleLayers.size > 0 && visibleLayers.size < layers.length
  }, [visibleLayers, layers])

  const toggleLayer = (name) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const zoomIn = () => setZoom((z) => z * 1.2)
  const zoomOut = () => setZoom((z) => z / 1.2)

  const toggleAllLayers = (checked) => {
    if (checked) setVisibleLayers(new Set(layers))
    else setVisibleLayers(new Set())
  }

  const allSelected = layers.length > 0 && visibleLayers.size === layers.length

  return svg ? (
    <div className="dwg-viewer">
      <div className="dwg-sidebar">
        <div className="dwg-controls">
          <button onClick={zoomOut}>-</button>
          <button onClick={zoomIn}>+</button>
        </div>
        <div className="dwg-layers">
          <label>
            <input
              type="checkbox"
              ref={selectAllRef}
              checked={allSelected}
              onChange={(e) => toggleAllLayers(e.target.checked)}
            />
            Select All
          </label>
          {layers.map((l) => (
            <label key={l}>
              <input
                type="checkbox"
                checked={visibleLayers.has(l)}
                onChange={() => toggleLayer(l)}
              />
              {l}
            </label>
          ))}
        </div>
      </div>
      <div
        className="dwg-container"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  ) : null
}
