import { useState } from 'react'
import { AppBar, Toolbar, Typography, Container, Button, Box } from '@mui/material'
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
    <Box className="App">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Drawing Viewer
          </Typography>
          <Button variant="contained" component="label">
            Select File
            <input hidden type="file" accept=".pdf,.dwg" onChange={handleFile} />
          </Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 2 }}>
        {file && fileType === 'pdf' && <PdfViewer file={file} />}
        {file && fileType === 'dwg' && <DwgViewer file={file} />}
        {file && !['pdf', 'dwg'].includes(fileType) && (
          <Typography>Unsupported file type.</Typography>
        )}
      </Container>
    </Box>
  )
}

export default App
