#pragma once
#include <filesystem>
#include <memory>
#include <string_view>

namespace ravs::scripting {
class LuaRuntime final {
public:
    LuaRuntime();
    ~LuaRuntime();
    LuaRuntime(const LuaRuntime&) = delete;
    LuaRuntime& operator=(const LuaRuntime&) = delete;
    LuaRuntime(LuaRuntime&&) noexcept;
    LuaRuntime& operator=(LuaRuntime&&) noexcept;
    [[nodiscard]] bool available() const noexcept;
    bool execute_file(const std::filesystem::path& path);
    bool execute_string(std::string_view source);
private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};
} // namespace ravs::scripting
