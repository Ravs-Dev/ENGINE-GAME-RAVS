#include "ravs/core/Engine.hpp"
#include "ravs/scripting/LuaRuntime.hpp"
#include <iostream>
int main(int argc, char** argv) {
    ravs::Engine engine;
    if (!engine.initialize()) return 1;
    ravs::scripting::LuaRuntime lua;
    if (argc > 1) {
        if (!lua.available()) {
            std::cerr << "Lua script requested, but Lua 5.4 is not enabled.\n";
            engine.shutdown();
            return 2;
        }
        if (!lua.execute_file(argv[1])) {
            engine.shutdown();
            return 3;
        }
    } else {
        engine.log(lua.available() ? "Lua runtime ready." : "Running without Lua support.");
        engine.log("Dedicated server bootstrap. Simulation/network loop is a future milestone.");
    }
    engine.shutdown();
    return 0;
}
