#!/bin/bash
# Skills Manager 快速安装脚本

set -e

echo "🚀 Skills Manager 安装程序"
echo "=========================="
echo ""

APP_PATH="src-tauri/target/release/bundle/macos/skills-manage.app"
INSTALL_PATH="/Applications/skills-manage.app"

# 检查构建产物是否存在
if [ ! -d "$APP_PATH" ]; then
    echo "❌ 错误: 找不到应用包"
    echo "请先运行: pnpm tauri build"
    exit 1
fi

echo "📦 找到应用: $APP_PATH"
echo "📍 安装位置: $INSTALL_PATH"
echo ""

# 如果已安装，询问是否覆盖
if [ -d "$INSTALL_PATH" ]; then
    echo "⚠️  检测到已安装的版本"
    read -p "是否覆盖安装? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 安装已取消"
        exit 0
    fi
    echo "🗑️  删除旧版本..."
    rm -rf "$INSTALL_PATH"
fi

# 复制应用
echo "📋 复制应用到 Applications..."
cp -r "$APP_PATH" "$INSTALL_PATH"

# 移除 quarantine 属性（避免 macOS 安全警告）
echo "🔓 移除安全限制..."
xattr -dr com.apple.quarantine "$INSTALL_PATH" 2>/dev/null || true

echo ""
echo "✅ 安装完成！"
echo ""
echo "🎯 快速启动:"
echo "   open /Applications/skills-manage.app"
echo ""
echo "或者从 Launchpad 中查找 'skills-manage'"
echo ""

# 询问是否立即启动
read -p "是否立即启动应用? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 正在启动..."
    open "$INSTALL_PATH"
fi

echo ""
echo "🎉 享受使用！"
