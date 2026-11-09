# RAVS ENGINE Native Roadmap

The existing desktop editor remains Electron + Three.js. The native runtime is developed as a separate C++20 target and will later be connected through a documented project/build interface.

| Milestone | Scope | Exit criteria |
|---|---|---|
| N0 | C++ runtime bootstrap + optional Lua 5.4 | Windows/Linux CI build and CTest pass |
| N1 | SDL3 platform layer | Window, input, resize, clean shutdown |
| N2 | Vulkan renderer | Swapchain, camera, mesh, texture, depth |
| N3 | World/ECS and assets | Stable entity IDs, serialization, import pipeline |
| N4 | Lua resource runtime | Manifest, lifecycle, events, hot reload, error isolation |
| N5 | Physics/animation/audio | Character controller and playable sample scene |
| N6 | Multiplayer | Headless authoritative server, replication, validation |
| N7 | Editor integration | Open/build/run native projects from RAVS Editor |

## Architecture rules

- Keep editor UI independent from runtime internals.
- C++ owns platform, memory, rendering, physics, audio and networking.
- Lua owns gameplay rules and resource scripts through a versioned API.
- Treat all client input and network messages as untrusted.
- Server owns canonical multiplayer state.
- Do not expose unrestricted OS or filesystem access to Lua resources.
- Keep third-party libraries behind RAVS interfaces.
