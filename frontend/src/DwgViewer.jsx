import { useEffect, useState } from 'react'
import { createModule, LibreDwg, Dwg_File_Type } from '@mlightcad/libredwg-web'
import wasmUrl from '../node_modules/@mlightcad/libredwg-web/wasm/libredwg-web.wasm?url'

export default function DwgViewer({ file }) {
  const [svg, setSvg] = useState(null)

  useEffect(() => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const wasmInstance = await createModule({
        locateFile: (path) => (path.endsWith('.wasm') ? wasmUrl : path),
      })
      const libredwg = LibreDwg.createByWasmInstance(wasmInstance)
      const dwgData = libredwg.dwg_read_data(reader.result, Dwg_File_Type.DWG)
      const db = libredwg.convert(dwgData)
      libredwg.dwg_free(dwgData)
      const svgStr = libredwg.dwg_to_svg(db)
      setSvg(svgStr)
    }
    reader.readAsArrayBuffer(file)
  }, [file])

  return svg ? (
    <div className="dwg-container" dangerouslySetInnerHTML={{ __html: svg }} />
  ) : null
}
