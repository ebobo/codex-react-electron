import { useEffect, useRef, useState } from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import RefreshIcon from '@mui/icons-material/Refresh'

export default function ImageViewer({ file }) {
  const [url, setUrl] = useState('')
  const [zoom, setZoom] = useState(1)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [overlay, setOverlay] = useState({ left: 0, top: 0, width: 0, height: 0 })
  const containerRef = useRef(null)
  const imgRef = useRef(null)
  const miniRef = useRef(null)
  const dragState = useRef(null)
  const [icons, setIcons] = useState([])
  const dragIcon = useRef(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  const zoomIn = () => setZoom((z) => z * 1.1)
  const zoomOut = () => setZoom((z) => z / 1.1)
  const resetZoom = () => setZoom(1)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    const update = () =>
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    if (img.complete) update()
    else img.addEventListener('load', update)
    return () => img.removeEventListener('load', update)
  }, [url])

  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    img.style.width = `${dimensions.width * zoom}px`
    img.style.height = `${dimensions.height * zoom}px`
  }, [zoom, dimensions])

  const handleIconPointerDown = (id) => (e) => {
    e.stopPropagation()
    dragIcon.current = { id, x: e.clientX, y: e.clientY }
    window.addEventListener('pointermove', handleIconMove)
    window.addEventListener('pointerup', handleIconUp)
  }
  const handleIconMove = (e) => {
    if (!dragIcon.current) return
    const { id, x, y } = dragIcon.current
    const dx = e.clientX - x
    const dy = e.clientY - y
    dragIcon.current.x = e.clientX
    dragIcon.current.y = e.clientY
    setIcons((icons) =>
      icons.map((ic) =>
        ic.id === id ? { ...ic, x: ic.x + dx, y: ic.y + dy } : ic
      )
    )
  }
  const handleIconUp = () => {
    dragIcon.current = null
    window.removeEventListener('pointermove', handleIconMove)
    window.removeEventListener('pointerup', handleIconUp)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const canPan =
      container.scrollWidth > container.clientWidth ||
      container.scrollHeight > container.clientHeight
    container.style.cursor = canPan ? 'grab' : 'default'
  }, [zoom, dimensions])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const allow = (e) => e.preventDefault()
    const handleDrop = (e) => {
      e.preventDefault()
      const src = e.dataTransfer.getData('application/x-icon-src')
      if (!src) return
      const rect = container.getBoundingClientRect()
      setIcons((prev) => [
        ...prev,
        {
          id: Date.now(),
          src,
          x: e.clientX - rect.left - 64,
          y: e.clientY - rect.top - 64,
        },
      ])
    }
    container.addEventListener('dragover', allow)
    container.addEventListener('drop', handleDrop)
    return () => {
      container.removeEventListener('dragover', allow)
      container.removeEventListener('drop', handleDrop)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleDown = (e) => {
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
    const handleMove = (e) => {
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
    container.addEventListener('mousedown', handleDown)
    container.addEventListener('mousemove', handleMove)
    container.addEventListener('mouseleave', endDrag)
    window.addEventListener('mouseup', endDrag)
    return () => {
      container.removeEventListener('mousedown', handleDown)
      container.removeEventListener('mousemove', handleMove)
      container.removeEventListener('mouseleave', endDrag)
      window.removeEventListener('mouseup', endDrag)
    }
  }, [zoom, dimensions])

  useEffect(() => {
    const mini = miniRef.current
    if (!mini || !url) return
    const scale = mini.clientWidth / dimensions.width
    mini.style.height = `${dimensions.height * scale}px`
  }, [dimensions, url])

  useEffect(() => {
    const container = containerRef.current
    const mini = miniRef.current
    if (!container || !mini || !dimensions.width) return
    const scale = mini.clientWidth / dimensions.width
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
  }, [zoom, dimensions])

  return (
    <Box className="img-viewer">
      <Box className="img-container" ref={containerRef}>
        {url && <img ref={imgRef} src={url} alt="Selected file" draggable="false" />}
        {icons.map((icon) => (
          <img
            key={icon.id}
            src={icon.src}
            className="overlay-icon"
            style={{ left: icon.x, top: icon.y }}
            onPointerDown={handleIconPointerDown(icon.id)}
            draggable={false}
          />
        ))}
      </Box>
      <Box className="img-sidebar">
        <Box className="img-mini-section">
          <Box className="img-mini-wrapper">
            {url && <img ref={miniRef} src={url} className="img-mini" alt="preview" />}
            <Box
              className="img-mini-overlay"
              sx={{
                left: overlay.left,
                top: overlay.top,
                width: overlay.width,
                height: overlay.height,
              }}
            />
          </Box>
          <Box className="img-controls">
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
  )
}
