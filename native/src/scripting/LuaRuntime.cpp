#include "ravs/scripting/LuaRuntime.hpp"
#include <iostream>
#include <string>
#ifndef RAVS_HAS_LUA
#define RAVS_HAS_LUA 0
#endif
#if RAVS_HAS_LUA
extern "C" {
#include <lua.h>
#include <lauxlib.h>
#include <lualib.h>
}
#endif
namespace ravs::scripting {
struct LuaRuntime::Impl {
#if RAVS_HAS_LUA
    lua_State* state{nullptr};
#endif
};
#if RAVS_HAS_LUA
namespace {
int engine_log(lua_State* state) {
    const char* message = luaL_checkstring(state, 1);
    std::cout << "[RAVS:Lua] " << message << '\n';
    return 0;
}
}
#endif
LuaRuntime::LuaRuntime() : impl_(std::make_unique<Impl>()) {
#if RAVS_HAS_LUA
    impl_->state = luaL_newstate();
    if (impl_->state) {
        luaL_openlibs(impl_->state);
        lua_newtable(impl_->state);
        lua_pushcfunction(impl_->state, engine_log);
        lua_setfield(impl_->state, -2, "log");
        lua_setglobal(impl_->state, "engine");
    }
#endif
}
LuaRuntime::~LuaRuntime() {
#if RAVS_HAS_LUA
    if (impl_ && impl_->state) lua_close(impl_->state);
#endif
}
LuaRuntime::LuaRuntime(LuaRuntime&&) noexcept = default;
LuaRuntime& LuaRuntime::operator=(LuaRuntime&&) noexcept = default;
bool LuaRuntime::available() const noexcept {
#if RAVS_HAS_LUA
    return impl_ && impl_->state;
#else
    return false;
#endif
}
bool LuaRuntime::execute_file(const std::filesystem::path& path) {
#if RAVS_HAS_LUA
    if (!available()) return false;
    const auto filename = path.string();
    if (luaL_loadfile(impl_->state, filename.c_str()) != LUA_OK ||
        lua_pcall(impl_->state, 0, LUA_MULTRET, 0) != LUA_OK) {
        std::cerr << "[RAVS:Lua] " << lua_tostring(impl_->state, -1) << '\n';
        lua_pop(impl_->state, 1);
        return false;
    }
    return true;
#else
    (void)path;
    std::cerr << "[RAVS:Lua] Lua 5.4 support is unavailable in this build.\n";
    return false;
#endif
}
bool LuaRuntime::execute_string(std::string_view source) {
#if RAVS_HAS_LUA
    if (!available()) return false;
    const std::string code(source);
    if (luaL_loadstring(impl_->state, code.c_str()) != LUA_OK ||
        lua_pcall(impl_->state, 0, LUA_MULTRET, 0) != LUA_OK) {
        std::cerr << "[RAVS:Lua] " << lua_tostring(impl_->state, -1) << '\n';
        lua_pop(impl_->state, 1);
        return false;
    }
    return true;
#else
    (void)source;
    return false;
#endif
}
}
