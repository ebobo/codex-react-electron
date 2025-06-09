import { useEffect, useState, useRef } from 'react'
import { createModule, LibreDwg, Dwg_File_Type } from '@mlightcad/libredwg-web'
import {
  Box,
  IconButton,
  Typography,
  Checkbox,
  FormControlLabel,
} from '@mui/material'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import RefreshIcon from '@mui/icons-material/Refresh'
import RotateLeftIcon from '@mui/icons-material/RotateLeft'
import RotateRightIcon from '@mui/icons-material/RotateRight'
import wasmUrl from '../node_modules/@mlightcad/libredwg-web/wasm/libredwg-web.wasm?url'
import { loadConfig, saveConfig } from './configStorage.js'

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
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [overlay, setOverlay] = useState({ left: 0, top: 0, width: 0, height: 0 })
  const [markers, setMarkers] = useState([])
  const [drawingSize, setDrawingSize] = useState({ width: 0, height: 0 })
  const [layersOpen, setLayersOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const selectAllRef = useRef(null)
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const miniRef = useRef(null)
  const panState = useRef(null)
  const handleDragOver = (e) => e.preventDefault()
  const handleDrop = (e) => {
    e.preventDefault()
    const src = e.dataTransfer.getData('icon')
    if (!src) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left - pan.x) / zoom
    const y = (e.clientY - rect.top - pan.y) / zoom
    setMarkers((prev) => [...prev, { x, y, src }])
  }
  const handleMarkerDown = (index) => (e) => {
    e.stopPropagation()
    e.preventDefault()
    const el = e.currentTarget
    el.classList.add('dragging')
    const startX = e.clientX
    const startY = e.clientY
    const startPos = markers[index]
    const move = (ev) => {
      const dx = (ev.clientX - startX) / zoom
      const dy = (ev.clientY - startY) / zoom
      setMarkers((prev) => {
        const arr = [...prev]
        arr[index] = { ...startPos, x: startPos.x + dx, y: startPos.y + dy }
        return arr
      })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      el.classList.remove('dragging')
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

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
    const reader = new FileReader()
    reader.onload = async () => {
      const data = await loadConfig(reader.result)
      setMarkers(data)
    }
    reader.readAsArrayBuffer(file)
  }, [file])

  useEffect(() => {
    const reader = new FileReader()
    reader.onload = async () => {
      await saveConfig(reader.result, markers)
    }
    reader.readAsArrayBuffer(file)
  }, [markers])

  useEffect(() => {
    if (!dbInfo) return
    const { libredwg, db } = dbInfo
    const filtered = filterDbByLayers(db, visibleLayers)
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

  const zoomIn = () => setZoom((z) => z * 1.1)
  const zoomOut = () => setZoom((z) => z / 1.1)
  const resetZoom = () => setZoom(1)
  const rotateLeft = () => setRotation((r) => r - 5)
  const rotateRight = () => setRotation((r) => r + 5)
  const resetRotation = () => setRotation(0)

  useEffect(() => {
    if (!svgRef.current) return
    svgRef.current.innerHTML = svg
    const el = svgRef.current.querySelector('svg')
    if (el) {
      const vb = el.viewBox.baseVal
      const width = vb && vb.width ? vb.width : el.getBBox().width
      const height = vb && vb.height ? vb.height : el.getBBox().height
      setDrawingSize({ width, height })
    }
  }, [svg])

  useEffect(() => {
    if (!svgRef.current) return
    const el = svgRef.current.querySelector('svg')
    if (el) {
      el.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`
      el.style.transformOrigin = 'center'
    }
  }, [svg, zoom, rotation, pan])

  useEffect(() => {
    const container = containerRef.current
    const miniWrapper = miniRef.current
    if (!container || !miniWrapper) return
    const mini = miniWrapper.querySelector('.dwg-mini')
    if (!mini) return
    const svgEl = container.querySelector('svg')
    if (!svgEl) return
    const vb = svgEl.viewBox.baseVal
    const width = vb && vb.width ? vb.width : svgEl.getBBox().width
    const height = vb && vb.height ? vb.height : svgEl.getBBox().height
    const scale = mini.clientWidth / width
    mini.innerHTML = ''
    const clone = svgEl.cloneNode(true)
    clone.removeAttribute('style')
    clone.setAttribute('width', width * scale)
    clone.setAttribute('height', height * scale)
    mini.appendChild(clone)
  }, [svg])

  useEffect(() => {
    const container = containerRef.current
    const miniWrapper = miniRef.current
    if (!container || !miniWrapper) return
    const mini = miniWrapper.querySelector('.dwg-mini')
    if (!mini) return
    const svgEl = container.querySelector('svg')
    if (!svgEl) return
    const vb = svgEl.viewBox.baseVal
    const width = vb && vb.width ? vb.width : svgEl.getBBox().width
    const height = vb && vb.height ? vb.height : svgEl.getBBox().height
    const scale = mini.firstChild
      ? mini.firstChild.getAttribute('width') / width
      : mini.clientWidth / width
    const update = () => {
      setOverlay({
        left: ((-container.clientWidth / 2 - pan.x) / zoom + width / 2) * scale,
        top: ((-container.clientHeight / 2 - pan.y) / zoom + height / 2) * scale,
        width: (container.clientWidth / zoom) * scale,
        height: (container.clientHeight / zoom) * scale,
      })
    }
    update()
  }, [svg, zoom, pan, rotation])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const svgEl = container.querySelector('svg')
    const getCanPan = () => {
      if (!svgEl) return false
      const vb = svgEl.viewBox.baseVal
      const width = vb && vb.width ? vb.width : svgEl.getBBox().width
      const height = vb && vb.height ? vb.height : svgEl.getBBox().height
      return (
        width * zoom > container.clientWidth ||
        height * zoom > container.clientHeight
      )
    }
    const handleDown = (e) => {
      if (!getCanPan()) return
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
    container.style.cursor = getCanPan() ? 'grab' : 'default'
    return () => {
      container.removeEventListener('pointerdown', handleDown)
      container.removeEventListener('pointermove', handleMove)
      container.removeEventListener('pointerup', handleUp)
      container.removeEventListener('pointerleave', handleUp)
    }
  }, [svg, zoom, pan])

  const toggleAllLayers = (checked) => {
    if (checked) setVisibleLayers(new Set(layers))
    else setVisibleLayers(new Set())
  }

  const allSelected = layers.length > 0 && visibleLayers.size === layers.length

  if (loading) {
    return <div className="dwg-loading">Loading drawing…</div>
  }

  return svg ? (
      <Box className="dwg-viewer">
        <Box className="dwg-container" ref={containerRef}>
          <div ref={svgRef} />
          <div
            className="config-layer"
            style={{
              width: drawingSize.width,
              height: drawingSize.height,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center'
            }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {markers.map((m, i) => (
              <img
                key={i}
                src={m.src}
                className="config-marker"
                style={{ left: m.x, top: m.y }}
                alt="marker"
                onPointerDown={handleMarkerDown(i)}
              />
            ))}
          </div>
        </Box>
        <Box className="dwg-sidebar">
          <Box className="dwg-mini-section">
            <Box className="dwg-mini-wrapper" ref={miniRef}>
              <Box className="dwg-mini" />
              <Box
                className="dwg-mini-overlay"
                sx={{
                  left: overlay.left,
                  top: overlay.top,
                  width: overlay.width,
                  height: overlay.height,
                }}
              />
            </Box>
            <Box className="dwg-controls">
              <Box className="zoom-controls">
                <Box className="zoom-buttons">
                  <IconButton onClick={zoomOut} size="small">
                    <ZoomOutIcon />
                  </IconButton>
                  <IconButton onClick={resetZoom} size="small">
                    <RefreshIcon />
                  </IconButton>
                  <IconButton onClick={zoomIn} size="small">
                    <ZoomInIcon />
                  </IconButton>
                </Box>
                <Typography className="zoom-indicator">
                  {Math.round(zoom * 100)}%
                </Typography>
              </Box>
              <Box className="rotate-controls">
                <IconButton onClick={rotateLeft} size="small">
                  <RotateLeftIcon />
                </IconButton>
                <IconButton onClick={resetRotation} size="small">
                  <RefreshIcon />
                </IconButton>
                <IconButton onClick={rotateRight} size="small">
                  <RotateRightIcon />
                </IconButton>
              </Box>
            </Box>
          </Box>
          <Box className="dwg-layers">
            <Typography
              className="layers-header"
              onClick={() => setLayersOpen((o) => !o)}
            >
            Layers {layersOpen ? '▾' : '▸'}
          </Typography>
          {layersOpen && (
            <Box className="layers-list">
              <FormControlLabel
                control={
                  <Checkbox
                    ref={selectAllRef}
                    checked={allSelected}
                    onChange={(e) => toggleAllLayers(e.target.checked)}
                  />
                }
                label="Select All"
              />
              {layers.map((l) => (
                <FormControlLabel
                  key={l}
                  control={
                    <Checkbox
                      checked={visibleLayers.has(l)}
                      onChange={() => toggleLayer(l)}
                    />
                  }
                  label={l}
                />
              ))}
            </Box>
          )}
          </Box>
        </Box>
      </Box>
    ) : null
  }
