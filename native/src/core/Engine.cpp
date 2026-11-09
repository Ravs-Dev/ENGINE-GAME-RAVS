#include "ravs/core/Engine.hpp"
#include <iostream>
namespace ravs {
bool Engine::initialize() {
    if (initialized_) return true;
    elapsed_seconds_ = 0.0;
    initialized_ = true;
    log("Native runtime initialized");
    return true;
}
void Engine::tick(double delta_seconds) {
    if (!initialized_ || delta_seconds < 0.0 || delta_seconds > 1.0) return;
    elapsed_seconds_ += delta_seconds;
}
void Engine::shutdown() {
    if (!initialized_) return;
    log("Native runtime shutdown");
    initialized_ = false;
}
void Engine::log(std::string_view message) const {
    std::cout << "[RAVS] " << message << '\n';
}
}
