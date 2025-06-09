import { Box } from '@mui/material'
import AutroGuard from './assets/AutroGuard.png'
import BSD from './assets/BSD_1000.png'
import MCP from './assets/mcp.png'

const icons = [AutroGuard, BSD, MCP]

export default function IconPalette() {
  const handleDragStart = (src) => (e) => {
    e.dataTransfer.setData('application/x-icon-src', src)
  }

  return (
    <Box className="icon-palette">
      {icons.map((src) => (
        <img
          key={src}
          src={src}
          width={128}
          height={128}
          draggable
          onDragStart={handleDragStart(src)}
        />
      ))}
    </Box>
  )
}
