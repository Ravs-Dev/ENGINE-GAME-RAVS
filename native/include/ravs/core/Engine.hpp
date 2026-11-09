#pragma once
#include <string_view>
namespace ravs {
class Engine final {
public:
    bool initialize();
    void tick(double delta_seconds);
    void shutdown();
    void log(std::string_view message) const;
    [[nodiscard]] bool initialized() const noexcept { return initialized_; }
    [[nodiscard]] double elapsed_seconds() const noexcept { return elapsed_seconds_; }
private:
    bool initialized_{false};
    double elapsed_seconds_{0.0};
};
}
