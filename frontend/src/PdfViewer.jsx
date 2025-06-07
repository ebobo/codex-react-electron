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
  const dragState = useRef(null)

  const zoomIn = () => setZoom((z) => z * 1.2)
  const zoomOut = () => setZoom((z) => z / 1.2)

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
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const canPan =
      container.scrollWidth > container.clientWidth ||
      container.scrollHeight > container.clientHeight
    container.style.cursor = canPan ? 'grab' : 'default'
  }, [zoom, page])




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
