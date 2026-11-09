# RAVS Native Runtime

C++20 native runtime bootstrap for Windows and Linux. This milestone provides engine lifecycle, a headless server executable, optional Lua 5.4 embedding, and CTest smoke coverage.

Build from the repository root:

```bash
cmake -S native -B native/build -DRAVS_WITH_LUA=ON
cmake --build native/build --config Debug
ctest --test-dir native/build -C Debug --output-on-failure
```

Run:

```bash
./native/build/ravs_server
./native/build/ravs_server native/scripts/hello.lua
```

Lua is optional at configure time so the C++ runtime can be built on a clean machine. Install Lua 5.4 development headers/libraries to enable it. Before running untrusted community scripts, replace unrestricted standard-library access with a sandbox and explicit engine capabilities.
