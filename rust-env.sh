#!/bin/bash
# Rust 环境配置脚本
# 使用方法: source rust-env.sh

# 设置 PATH
export PATH="$HOME/.cargo/bin:$PATH"

# 使用中国镜像加速（可选）
export RUSTUP_DIST_SERVER="https://rsproxy.cn"
export RUSTUP_UPDATE_ROOT="https://rsproxy.cn/rustup"

# 显示版本信息
echo "✓ Rust 环境已配置"
rustc --version 2>/dev/null && cargo --version 2>/dev/null || echo "请重新打开终端或运行: source ~/.cargo/env"
