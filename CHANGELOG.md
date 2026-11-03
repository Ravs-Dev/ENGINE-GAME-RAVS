# Changelog

## 0.7.0

- Rework the editor into an Unreal-inspired Level Editor layout while retaining RAVS branding.
- Rename Hierarchy/Inspector concepts to World Outliner and Details and Project Files to Content Browser.
- Add functional Lit, Unlit, and Wireframe viewport shading modes.
- Add World/Local transform space, adjustable camera speed, actor/triangle/FPS viewport statistics.
- Add Simulate mode alongside Play/Pause/Step.
- Add collapsible Content Drawer and Output Log dock controls.
- Keep existing scene format, project files, materials, lights, toolchains, and desktop export compatible.


## 0.6.1

- Redesign editor chrome to a Unity-inspired RAVS layout without copying Unity branding.
- Add Q/W/E/R transform toolbar, Play/Pause/Step controls, Scene/Game tabs, and Edit/Play mode badge.
- Add Project/Console tabs and in-editor event console.
- Keep existing scene, project, inspector, export, and scripting/toolchain features compatible.


## 0.6.0

- Add component-style object model with Active, Tag, Layer, PBR material, render settings, and Script Components.
- Add Torus, Point Light, and Directional Light scene objects.
- Add environment controls for ambient light, sun light, exposure, and fog.
- Add multi-language Script Component profiles for Lua, C, C++, C#, and Java.
- Add desktop Toolchain Manager detection for Lua, GCC/Clang/MSVC, .NET, and Java.
- Keep existing version-2 scenes compatible by filling new component defaults during load.


## 0.5.1

- Add camera presets, Frame All, and focus controls for faster scene navigation.
- Add Plane and Cone primitives to the scene editor.
- Add Wireframe viewport mode and a global Shadows toggle.
- Improve viewport controls while keeping scene format compatibility with existing v2 projects.
- Use a standard 256×256 packaging icon so Linux hicolor menus can locate the new Ravs logo.
- Preserve the full-resolution logo for the editor and game loading screens.

## 0.5.0

- Add Project Files with folder/file creation, text/script editing, imports, and project backups.
- Add restricted desktop disk access through native folder selection, revision checks, and path/symlink protections.
- Add black/cyan theme and replace legacy icons with the Ravs logo adapted from the owner's reference.
- Add Ravs splash screens for startup/Play, editable game title and duration, and previews.
- Export standalone HTML games with an embedded renderer, scene, logo, and Ravs loading screen.
- Keep project scripts as editable text; script execution and native game export remain unavailable.
- Expand tests for real disk writes, conflict handling, project restoration, and branded game exports.

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
