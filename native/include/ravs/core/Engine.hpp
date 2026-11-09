#pragma once
#include <string_view>

namespace ravs {
class Engine final {
public:
    bool initialize();
    void shutdown();
    void log(std::string_view message) const;
    [[nodiscard]] bool initialized() const noexcept { return initialized_; }
private:
    bool initialized_{false};
};
} // namespace ravs
