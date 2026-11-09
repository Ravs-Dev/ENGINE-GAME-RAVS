# Milestone 1: Native Runtime

This milestone adds a C++20 runtime foundation alongside the existing Electron + Three.js editor. The editor remains intact; this is not yet a Vulkan renderer.

Included:
- Engine lifecycle and guarded time accumulation.
- Optional embedded Lua 5.4 with `engine.log()`.
- Headless server bootstrap.
- CMake and CTest smoke test.

Next:
1. Add CI matrix for Windows/Linux.
2. Add SDL3 platform/window/input layer.
3. Add a versioned Lua resource manifest and sandbox.
4. Connect editor project launch to the native runtime.
5. Add Vulkan renderer behind a renderer interface.
