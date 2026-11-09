# RAVS ENGINE Native Runtime

This folder introduces the native C++20 runtime alongside the existing Electron/Three.js editor. It is an additive foundation; it does not replace the working editor or claim that a full 3D renderer/network stack already exists.

## Build

Requirements: CMake 3.20+ and a C++20 compiler (MSVC 2022, GCC 11+, or Clang 14+).

Windows:
```powershell
cmake -S native -B native/build
cmake --build native/build --config Release
ctest --test-dir native/build -C Release --output-on-failure
.
ativeuildReleaseavs_server.exe
```

Linux:
```bash
cmake -S native -B native/build -DCMAKE_BUILD_TYPE=Release
cmake --build native/build -j
ctest --test-dir native/build --output-on-failure
./native/build/ravs_server
```

Lua 5.4 is optional for the first bootstrap build. Install the Lua 5.4 development headers/library and CMake will enable it automatically. With Lua enabled:
```bash
./native/build/ravs_server native/scripts/hello.lua
```

## Current scope

- C++20 runtime lifecycle and logging.
- Optional Lua 5.4 VM with a deliberately small `engine.log()` API.
- Headless server executable shell.
- Cross-platform CMake and CTest.
- Windows/Linux CI workflow.

This is not yet a renderer, game loop, physics system, or multiplayer server. Those are future milestones.

## Next milestones

1. SDL3 platform/window/input abstraction.
2. Vulkan renderer and asset pipeline.
3. World/ECS, scene serialization, streaming cells.
4. Lua resource manifests, lifecycle, event bus, hot reload and sandbox.
5. Character controller, physics, animation and audio.
6. Authoritative dedicated server, replication and interest management.
7. Editor-to-runtime project packaging.
