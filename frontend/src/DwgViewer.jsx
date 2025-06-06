import { useEffect, useState, useRef } from 'react'
import { createModule, LibreDwg, Dwg_File_Type } from '@mlightcad/libredwg-web'
import wasmUrl from '../node_modules/@mlightcad/libredwg-web/wasm/libredwg-web.wasm?url'

function filterDbByLayers(db, layerSet) {
  const filtered = structuredClone(db)
  filtered.entities = db.entities.filter((e) => layerSet.has(e.layer))
  filtered.tables.BLOCK_RECORD.entries = db.tables.BLOCK_RECORD.entries.map((b) => ({
    ...b,
    entities: b.entities.filter((e) => layerSet.has(e.layer)),
  }))
  return filtered
}

export default function DwgViewer({ file }) {
  const [svg, setSvg] = useState(null)
  const [dbInfo, setDbInfo] = useState(null)
  const [layers, setLayers] = useState([])
  const [visibleLayers, setVisibleLayers] = useState(new Set())
  const [layerPreviews, setLayerPreviews] = useState({})
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [loading, setLoading] = useState(false)
  const selectAllRef = useRef(null)
  const svgContainerRef = useRef(null)
  const panState = useRef(null)

  useEffect(() => {
    if (!file) return
    setLoading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const wasmInstance = await createModule({
          locateFile: (path) => (path.endsWith('.wasm') ? wasmUrl : path),
        })
        const libredwg = LibreDwg.createByWasmInstance(wasmInstance)
        const dwgData = libredwg.dwg_read_data(reader.result, Dwg_File_Type.DWG)
        const db = libredwg.convert(dwgData)
        libredwg.dwg_free(dwgData)
        setDbInfo({ libredwg, db })
        const usedLayers = new Set()
        db.entities.forEach((e) => usedLayers.add(e.layer))
        db.tables.BLOCK_RECORD.entries.forEach((b) =>
          b.entities.forEach((e) => usedLayers.add(e.layer))
        )
        const layerNames = db.tables.LAYER.entries
          .map((l) => l.name)
          .filter((n) => usedLayers.has(n))
        setLayers(layerNames)
        setVisibleLayers(new Set(layerNames))
      } finally {
        setLoading(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [file])

  useEffect(() => {
    if (!dbInfo) return
    const { libredwg, db } = dbInfo
    const filtered = filterDbByLayers(db, visibleLayers)
    const svgStr = libredwg.dwg_to_svg(filtered)
    setSvg(svgStr)
  }, [dbInfo, visibleLayers])

  useEffect(() => {
    if (!dbInfo) return
    const { libredwg, db } = dbInfo
    const normalizeSvg = (str) => {
      const doc = new DOMParser().parseFromString(str, 'image/svg+xml')
      const el = doc.documentElement
      const origW = el.getAttribute('width') || '100'
      const origH = el.getAttribute('height') || '100'
      if (!el.getAttribute('viewBox')) {
        el.setAttribute('viewBox', `0 0 ${origW} ${origH}`)
      }
      el.setAttribute('width', '48')
      el.setAttribute('height', '48')
      el.setAttribute('preserveAspectRatio', 'xMidYMid meet')
      return el.outerHTML
    }
    const previews = {}
    for (const name of layers) {
      const filtered = filterDbByLayers(db, new Set([name]))
      previews[name] = normalizeSvg(libredwg.dwg_to_svg(filtered))
    }
    setLayerPreviews(previews)
  }, [dbInfo, layers])

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
  const resetZoom = () => setZoom(1)
  const rotateLeft = () => setRotation((r) => r - 5)
  const rotateRight = () => setRotation((r) => r + 5)
  const resetRotation = () => setRotation(0)

  useEffect(() => {
    if (!svgContainerRef.current) return
    const el = svgContainerRef.current.querySelector('svg')
    if (el) {
      el.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`
      el.style.transformOrigin = 'center'
    }
  }, [svg, zoom, rotation, pan])

  useEffect(() => {
    const container = svgContainerRef.current
    if (!container) return
    const handleDown = (e) => {
      panState.current = {
        x: e.clientX,
        y: e.clientY,
        startX: pan.x,
        startY: pan.y,
      }
      container.style.cursor = 'grabbing'
    }
    const handleMove = (e) => {
      if (!panState.current) return
      const dx = e.clientX - panState.current.x
      const dy = e.clientY - panState.current.y
      setPan({ x: panState.current.startX + dx, y: panState.current.startY + dy })
    }
    const handleUp = () => {
      panState.current = null
      container.style.cursor = 'grab'
    }
    container.addEventListener('pointerdown', handleDown)
    container.addEventListener('pointermove', handleMove)
    container.addEventListener('pointerup', handleUp)
    container.addEventListener('pointerleave', handleUp)
    container.style.cursor = 'grab'
    return () => {
      container.removeEventListener('pointerdown', handleDown)
      container.removeEventListener('pointermove', handleMove)
      container.removeEventListener('pointerup', handleUp)
      container.removeEventListener('pointerleave', handleUp)
    }
  }, [pan.x, pan.y])

  const toggleAllLayers = (checked) => {
    if (checked) setVisibleLayers(new Set(layers))
    else setVisibleLayers(new Set())
  }

  const allSelected = layers.length > 0 && visibleLayers.size === layers.length

  if (loading) {
    return <div className="dwg-loading">Loading drawing…</div>
  }

  return svg ? (
    <div className="dwg-viewer">
      <div
        className="dwg-container"
        ref={svgContainerRef}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="dwg-sidebar">
        <div className="dwg-controls">
          <div className="zoom-controls">
            <button onClick={zoomOut}>-</button>
            <button onClick={resetZoom}>reset</button>
            <button onClick={zoomIn}>+</button>
          </div>
          <div className="rotate-controls">
            <button onClick={rotateLeft}>⟲</button>
            <button onClick={resetRotation}>reset</button>
            <button onClick={rotateRight}>⟳</button>
          </div>
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
              <span
                className="layer-preview"
                dangerouslySetInnerHTML={{ __html: layerPreviews[l] }}
              />
              {l}
            </label>
          ))}
        </div>
      </div>
    </div>
  ) : null
}
