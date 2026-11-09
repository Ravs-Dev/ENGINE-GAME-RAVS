#include "ravs/core/Engine.hpp"
#include "ravs/scripting/LuaRuntime.hpp"
#include <cassert>

int main() {
    ravs::Engine engine;
    assert(!engine.initialized());
    assert(engine.initialize());
    assert(engine.initialized());
    engine.shutdown();
    assert(!engine.initialized());

    ravs::scripting::LuaRuntime lua;
    if (lua.available()) assert(lua.execute_string("engine.log('Lua smoke test passed')"));
    return 0;
}
