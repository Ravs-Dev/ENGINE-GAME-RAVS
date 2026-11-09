cmake_minimum_required(VERSION 3.20)
project(RAVSEngineNative VERSION 0.2.0 LANGUAGES CXX)

option(RAVS_ENABLE_LUA "Enable Lua 5.4 scripting when development files are installed" ON)
option(RAVS_BUILD_TESTS "Build native smoke tests" ON)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(ravs_runtime
    src/core/Engine.cpp
    src/scripting/LuaRuntime.cpp
)
target_include_directories(ravs_runtime PUBLIC include)
target_compile_features(ravs_runtime PUBLIC cxx_std_20)

if(MSVC)
    target_compile_options(ravs_runtime PRIVATE /W4 /permissive-)
else()
    target_compile_options(ravs_runtime PRIVATE -Wall -Wextra -Wpedantic)
endif()

if(RAVS_ENABLE_LUA)
    find_package(Lua 5.4 QUIET)
endif()

if(RAVS_ENABLE_LUA AND LUA_FOUND)
    target_compile_definitions(ravs_runtime PUBLIC RAVS_HAS_LUA=1)
    target_include_directories(ravs_runtime PRIVATE ${LUA_INCLUDE_DIR})
    target_link_libraries(ravs_runtime PUBLIC ${LUA_LIBRARIES})
    message(STATUS "RAVS Lua runtime enabled: ${LUA_VERSION_STRING}")
else()
    target_compile_definitions(ravs_runtime PUBLIC RAVS_HAS_LUA=0)
    message(STATUS "Lua 5.4 development package not found; building core-only runtime")
endif()

add_executable(ravs_server src/server/main.cpp)
target_link_libraries(ravs_server PRIVATE ravs_runtime)

if(RAVS_BUILD_TESTS)
    enable_testing()
    add_executable(ravs_native_tests tests/runtime_tests.cpp)
    target_link_libraries(ravs_native_tests PRIVATE ravs_runtime)
    add_test(NAME ravs_native_tests COMMAND ravs_native_tests)
endif()
