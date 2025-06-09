import autroGuard from './assets/AutroGuard.png'
import bsd1000 from './assets/BSD_1000.png'
import mcp from './assets/mcp.png'

const icons = [
  { name: 'AutroGuard', src: autroGuard },
  { name: 'BSD_1000', src: bsd1000 },
  { name: 'MCP', src: mcp },
]

export default function IconPalette() {
  const handleDragStart = (src) => (e) => {
    e.dataTransfer.setData('icon', src)
  }

  return (
    <div className="icon-palette">
      {icons.map((icon) => (
        <img
          key={icon.name}
          src={icon.src}
          alt={icon.name}
          draggable="true"
          onDragStart={handleDragStart(icon.src)}
          className="palette-icon"
        />
      ))}
    </div>
  )
}
