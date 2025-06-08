# Codex React Electron Example

This repository contains a small React drawing viewer. A new Electron wrapper lets you run the app as a desktop application and offloads DWG conversion to the Electron main process.

## Running the Electron App

```bash
cd frontend
npm install
npm run electron
```

The script builds the React frontend and then launches Electron. Converting DWG files requires `@mlightcad/libredwg-web`, which is included as a dependency.
