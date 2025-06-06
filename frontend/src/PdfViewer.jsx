import { useEffect, useRef, useState } from 'react'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Set the worker source for pdfjs to a bundled worker script
GlobalWorkerOptions.workerSrc = pdfWorker

export default function PdfViewer({ file }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [page, setPage] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const panState = useRef(null)
  const hDownRef = useRef(false)
  const pointerInsideRef = useRef(false)

  const zoomIn = () => setZoom((z) => z * 1.2)
  const zoomOut = () => setZoom((z) => z / 1.2)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'h' || e.key === 'H') {
        if (!hDownRef.current) {
          hDownRef.current = true
          if (pointerInsideRef.current && containerRef.current && !panState.current) {
            containerRef.current.style.cursor = 'grab'
          }
        }
      }
    }
    const handleKeyUp = (e) => {
      if (e.key === 'h' || e.key === 'H') {
        hDownRef.current = false
        if (containerRef.current && !panState.current) {
          containerRef.current.style.cursor = 'default'
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

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
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    canvas.style.transform = `translate(${pan.x}px, ${pan.y}px)`
  }, [pan])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleEnter = () => {
      pointerInsideRef.current = true
      if (hDownRef.current && !panState.current) {
        container.style.cursor = 'grab'
      }
    }
    const handleLeave = () => {
      pointerInsideRef.current = false
      panState.current = null
      container.style.cursor = 'default'
    }
    const handleDown = (e) => {
      if (!hDownRef.current) return
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
      if (!panState.current) return
      panState.current = null
      if (hDownRef.current && pointerInsideRef.current) {
        container.style.cursor = 'grab'
      } else {
        container.style.cursor = 'default'
      }
    }
    container.addEventListener('pointerenter', handleEnter)
    container.addEventListener('pointerleave', handleLeave)
    container.addEventListener('pointerdown', handleDown)
    container.addEventListener('pointermove', handleMove)
    container.addEventListener('pointerup', handleUp)
    return () => {
      container.removeEventListener('pointerenter', handleEnter)
      container.removeEventListener('pointerleave', handleLeave)
      container.removeEventListener('pointerdown', handleDown)
      container.removeEventListener('pointermove', handleMove)
      container.removeEventListener('pointerup', handleUp)
    }
  }, [pan.x, pan.y])

  return page ? (
    <div className="pdf-viewer">
      <div className="pdf-container" ref={containerRef}>
        <canvas ref={canvasRef} />
      </div>
      <div className="pdf-sidebar">
        <div className="pdf-controls">
          <div className="zoom-controls">
            <button onClick={zoomOut}>-</button>
            <button onClick={zoomIn}>+</button>
          </div>
        </div>
      </div>
    </div>
  ) : null
}
