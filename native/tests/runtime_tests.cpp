#include "ravs/core/Engine.hpp"
#include "ravs/scripting/LuaRuntime.hpp"
#include <cassert>
int main() {
    ravs::Engine engine;
    assert(!engine.initialized());
    assert(engine.initialize());
    engine.tick(0.25);
    assert(engine.elapsed_seconds() == 0.25);
    engine.shutdown();
    assert(!engine.initialized());
    ravs::scripting::LuaRuntime lua;
    if (lua.available()) assert(lua.execute_string("engine.log('native smoke test')"));
    return 0;
}
