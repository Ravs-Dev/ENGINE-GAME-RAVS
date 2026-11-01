# Changelog

## 0.4.0

- Add scene undo/redo with up to 100 edit transactions, including atomic gizmo drags.
- Connect desktop Undo/Redo and Save menu items through a restricted preload bridge.
- Add empty scenes, hierarchy search, Cylinder primitives, and editor keyboard shortcuts.
- Add transform snapping and persistent background/grid scene settings.
- Show unsaved changes and confirm before closing or reloading edited scenes.
- Keep legacy 3D version-2 scenes readable and preserve Play/Stop scene restoration.
- Refresh geometry when imported objects reuse an ID with a different primitive type.
- Expand model, browser, and desktop regression coverage.

## 0.3.2

- Release Windows NSIS EXE, Linux AppImage, and Debian packages.
- Install the Electron runtime explicitly for desktop startup and CI smoke tests.
