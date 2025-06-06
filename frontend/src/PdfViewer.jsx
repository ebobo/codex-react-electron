import { useEffect, useRef } from 'react'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Set the worker source for pdfjs to a bundled worker script
GlobalWorkerOptions.workerSrc = pdfWorker

export default function PdfViewer({ file }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const typedarray = new Uint8Array(reader.result)
      const pdf = await getDocument({ data: typedarray }).promise
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = canvasRef.current
      canvas.height = viewport.height
      canvas.width = viewport.width
      const context = canvas.getContext('2d')
      await page.render({ canvasContext: context, viewport }).promise
    }
    reader.readAsArrayBuffer(file)
  }, [file])

  return <canvas ref={canvasRef} />
}
