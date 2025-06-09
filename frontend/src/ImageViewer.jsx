import { useEffect, useState } from 'react'
import { Box } from '@mui/material'

export default function ImageViewer({ file }) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  return (
    <Box className="img-container">
      {url && <img src={url} alt="Selected file" />}
    </Box>
  )
}
