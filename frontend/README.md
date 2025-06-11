# Drawing Viewer (React + Vite)

This project showcases a lightweight drawing viewer written with React and bundled with Vite. It allows importing either a DWG or PDF file from your local machine and displays the content with a set of common navigation tools.

DWG support is provided by the [@mlightcad/libredwg-web](https://www.npmjs.com/package/@mlightcad/libredwg-web) package which exposes the [LibreDWG](https://www.gnu.org/software/libredwg/) library through a WebAssembly module. PDF rendering uses [pdfjs-dist](https://github.com/mozilla/pdf.js).

The WebAssembly binary for LibreDWG is loaded directly from the package at run time so no large assets are checked into the repository.

## Architecture

The source for the viewer lives in the `frontend` folder and is structured as a small React application:

- `App.jsx` – top level component that lets the user pick a file and chooses the appropriate viewer.
- `DwgViewer.jsx` – converts DWG data to SVG using LibreDWG, then renders the SVG with zoom, pan, rotation and per‑layer visibility controls. A miniature overview of the drawing helps navigate large files.
- `PdfViewer.jsx` – renders the first page of a PDF to a canvas using pdfjs and provides zoom and panning with a similar mini preview.

Styling is handled with plain CSS in `App.css`. Vite serves the app during development and produces a production build when running `npm run build`.

## Libraries Used

- **React 19** – UI framework for building the component hierarchy.
- **Vite 6** – development server and bundler.
- **@mlightcad/libredwg-web** – WebAssembly wrapper around LibreDWG to parse DWG files and convert them to SVG.
- **pdfjs-dist** – Mozilla's PDF rendering library for displaying PDF files.

## Development

```bash
npm install
npm run dev
```

After the dev server starts, open the printed local URL in your browser to try the viewer.

## Features

- Import local DWG or PDF files.
- Zoom and pan drawings using mouse or touch gestures.
- Toggle individual DWG layers on or off.
- Rotate DWG drawings in 5° increments.
- Mini map preview with red overlay to show the current viewport.
- Zoom percentage indicators and reset buttons for both viewers.
- Viewer area expands to nearly the full height of the browser window by default.
- Drag icons from the palette to place configuration markers.
- The icon palette appears only after a file is loaded.
- Palette icons are 54×54 pixels and enlarge slightly when hovered or dragged.
- Marker positions are saved per file using local storage.
- Dragging markers does not pan the canvas.
