import { useEffect, useRef, useState } from 'react'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import { Box, Button, IconButton, Typography } from '@mui/material'
import { loadConfig, saveConfig } from './configStorage.js'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import RefreshIcon from '@mui/icons-material/Refresh'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Set the worker source for pdfjs to a bundled worker script
GlobalWorkerOptions.workerSrc = pdfWorker

export default function PdfViewer({ file }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const miniCanvasRef = useRef(null)
  const [page, setPage] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [overlay, setOverlay] = useState({ left: 0, top: 0, width: 0, height: 0 })
  const [markers, setMarkers] = useState([])
  const dragState = useRef(null)
  const handleDragOver = (e) => e.preventDefault()
  const handleDrop = (e) => {
    e.preventDefault()
    const src = e.dataTransfer.getData('icon')
    if (!src) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom
    setMarkers((prev) => [...prev, { x, y, src }])
  }
  const handleMarkerDown = (index) => (e) => {
    e.stopPropagation()
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
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const zoomIn = () => setZoom((z) => z * 1.1)
  const zoomOut = () => setZoom((z) => z / 1.1)
  const resetZoom = () => setZoom(1)

  useEffect(() => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const typedarray = new Uint8Array(reader.result)
      const pdf = await getDocument({ data: typedarray }).promise
      const firstPage = await pdf.getPage(1)
      setPage(firstPage)
    }
    reader.readAsArrayBuffer(file)
  }, [file])

  useEffect(() => {
    const reader = new FileReader()
    reader.onload = async () => {
      const markersData = await loadConfig(reader.result)
      setMarkers(markersData)
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
    if (!page) return
    const viewport = page.getViewport({ scale: zoom })
    const canvas = canvasRef.current
    canvas.height = viewport.height
    canvas.width = viewport.width
    const context = canvas.getContext('2d')
    context.clearRect(0, 0, canvas.width, canvas.height)
    page.render({ canvasContext: context, viewport })
  }, [page, zoom])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseDown = (e) => {
      const canPan =
        container.scrollWidth > container.clientWidth ||
        container.scrollHeight > container.clientHeight
      if (!canPan) return
      dragState.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      }
      container.style.cursor = 'grabbing'
      e.preventDefault()
    }
    const handleMouseMove = (e) => {
      if (!dragState.current) return
      const dx = e.clientX - dragState.current.x
      const dy = e.clientY - dragState.current.y
      container.scrollLeft = dragState.current.scrollLeft - dx
      container.scrollTop = dragState.current.scrollTop - dy
    }
    const endDrag = () => {
      if (!dragState.current) return
      dragState.current = null
      container.style.cursor = 'grab'
    }

    container.addEventListener('mousedown', handleMouseDown)
    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', endDrag)
    window.addEventListener('mouseup', endDrag)
    return () => {
      container.removeEventListener('mousedown', handleMouseDown)
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', endDrag)
      window.removeEventListener('mouseup', endDrag)
    }
  }, [page])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const canPan =
      container.scrollWidth > container.clientWidth ||
      container.scrollHeight > container.clientHeight
    container.style.cursor = canPan ? 'grab' : 'default'
  }, [zoom, page])

  useEffect(() => {
    const container = containerRef.current
    const mini = miniCanvasRef.current
    if (!page || !container || !mini) return

    const viewport = page.getViewport({ scale: 1 })
    const scale = mini.clientWidth / viewport.width
    const miniViewport = page.getViewport({ scale })
    mini.width = miniViewport.width
    mini.height = miniViewport.height
    const ctx = mini.getContext('2d')
    ctx.clearRect(0, 0, mini.width, mini.height)
    page.render({ canvasContext: ctx, viewport: miniViewport })
  }, [page])

  useEffect(() => {
    const container = containerRef.current
    const mini = miniCanvasRef.current
    if (!container || !mini || !page) return
    const viewport = page.getViewport({ scale: 1 })
    const scale = mini.width / viewport.width
    const updateOverlay = () => {
      setOverlay({
        left: (container.scrollLeft / zoom) * scale,
        top: (container.scrollTop / zoom) * scale,
        width: (container.clientWidth / zoom) * scale,
        height: (container.clientHeight / zoom) * scale,
      })
    }
    updateOverlay()
    container.addEventListener('scroll', updateOverlay)
    return () => container.removeEventListener('scroll', updateOverlay)
  }, [zoom, page])




  return page ? (
    <Box className="pdf-viewer">
      <Box className="pdf-container" ref={containerRef}>
        <canvas ref={canvasRef} />
        <div
          className="config-layer"
          style={{ width: canvasRef.current ? canvasRef.current.width : 0, height: canvasRef.current ? canvasRef.current.height : 0 }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {markers.map((m, i) => (
            <img
              key={i}
              src={m.src}
              className="config-marker"
              style={{ left: m.x * zoom, top: m.y * zoom }}
              alt="marker"
              onPointerDown={handleMarkerDown(i)}
            />
          ))}
        </div>
      </Box>
      <Box className="pdf-sidebar">
        <Box className="pdf-mini-section">
          <Box className="pdf-mini-wrapper">
            <canvas ref={miniCanvasRef} className="pdf-mini" />
            <Box
              className="pdf-mini-overlay"
              sx={{
                left: overlay.left,
                top: overlay.top,
                width: overlay.width,
                height: overlay.height,
              }}
            />
          </Box>
          <Box className="pdf-controls">
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
        </Box>
        </Box>
      </Box>
    </Box>
  ) : null
}
