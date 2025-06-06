import { useState } from 'react'
import PdfViewer from './PdfViewer.jsx'
import DwgViewer from './DwgViewer.jsx'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [fileType, setFileType] = useState('')

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    const ext = f.name.split('.').pop().toLowerCase()
    setFileType(ext)
  }

  return (
    <div className="App">
      <h1>Drawing Viewer</h1>
      <input type="file" accept=".pdf,.dwg" onChange={handleFile} />
      {file && fileType === 'pdf' && <PdfViewer file={file} />}
      {file && fileType === 'dwg' && <DwgViewer file={file} />}
      {file && !['pdf', 'dwg'].includes(fileType) && (
        <p>Unsupported file type.</p>
      )}
    </div>
  )
}

export default App
