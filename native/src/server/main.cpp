#include "ravs/core/Engine.hpp"
#include "ravs/scripting/LuaRuntime.hpp"
#include <iostream>

int main(int argc, char** argv) {
    ravs::Engine engine;
    if (!engine.initialize()) return 1;
    ravs::scripting::LuaRuntime lua;
    if (argc > 1) {
        if (!lua.available()) {
            engine.log("Lua script supplied, but Lua 5.4 is unavailable.");
            engine.shutdown();
            return 2;
        }
        if (!lua.execute_file(argv[1])) {
            engine.log("Lua script execution failed.");
            engine.shutdown();
            return 3;
        }
    } else {
        engine.log(lua.available() ? "Lua 5.4 ready." : "Core-only mode; install Lua 5.4 dev files to enable scripts.");
        engine.log("Dedicated server loop and networking are planned milestones.");
    }
    engine.shutdown();
    return 0;
}
