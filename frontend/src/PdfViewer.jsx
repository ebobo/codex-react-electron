import { useEffect, useRef, useState } from 'react'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
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
  const dragState = useRef(null)

  const zoomIn = () => setZoom((z) => z * 1.2)
  const zoomOut = () => setZoom((z) => z / 1.2)
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
    <div className="pdf-viewer">
      <div className="pdf-container" ref={containerRef}>
        <canvas ref={canvasRef} />
      </div>
      <div className="pdf-sidebar">
        <div className="pdf-mini-wrapper">
          <canvas ref={miniCanvasRef} className="pdf-mini" />
          <div
            className="pdf-mini-overlay"
            style={{
              left: overlay.left,
              top: overlay.top,
              width: overlay.width,
              height: overlay.height,
            }}
          />
        </div>
        <div className="pdf-controls">
          <div className="zoom-controls">
            <div className="zoom-buttons">
              <button onClick={zoomOut}>-</button>
              <button onClick={resetZoom}>reset</button>
              <button onClick={zoomIn}>+</button>
            </div>
            <span className="zoom-indicator">{Math.round(zoom * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  ) : null
}
