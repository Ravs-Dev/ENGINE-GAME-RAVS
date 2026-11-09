#include "ravs/core/Engine.hpp"
#include <iostream>

namespace ravs {
bool Engine::initialize() {
    if (initialized_) return true;
    log("RAVS ENGINE native runtime starting");
    initialized_ = true;
    return true;
}
void Engine::shutdown() {
    if (!initialized_) return;
    log("RAVS ENGINE native runtime stopping");
    initialized_ = false;
}
void Engine::log(std::string_view message) const {
    std::cout << "[RAVS] " << message << '\n';
}
} // namespace ravs
