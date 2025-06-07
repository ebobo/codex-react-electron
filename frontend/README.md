# Drawing Viewer (React + Vite)

This simple frontend app lets you test importing and displaying drawing files. PDF files are rendered with [`pdfjs-dist`](https://github.com/mozilla/pdf.js). DWG files are converted to SVG with [`@mlightcad/libredwg-web`](https://www.npmjs.com/package/@mlightcad/libredwg-web).

The viewer loads the library's WebAssembly module directly from the package, so no large binaries are stored in the repository.

## Development

```bash
npm install
npm run dev
```

Open your browser at the printed local address to use the app.

## Features

- Zoom and pan DWG drawings.
- Toggle individual layers on or off.
- Rotate the drawing in 5° increments with the rotate buttons.
- View PDF files with a built-in canvas renderer.
- Zoom percentage indicators and reset buttons for both viewers.
- Viewer area expands to nearly the full height of the browser window by default.
