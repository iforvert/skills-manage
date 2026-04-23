#!/bin/bash
# 提交变更并推送到 fork 仓库

set -e

echo "📦 提交变更并推送"
echo "===================="
echo ""

BRANCH_NAME="fix/tilde-path-expansion"
REMOTE_NAME="my-fork"

# 检查是否配置了 remote
if ! git remote | grep -q "^${REMOTE_NAME}$"; then
    echo "❌ 错误: 未找到 remote '${REMOTE_NAME}'"
    echo "请先运行: ./setup-fork.sh"
    exit 1
fi

# 检查是否在 main 分支
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  当前在分支: $CURRENT_BRANCH"
    read -p "是否切换回 main 分支? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout main
    fi
fi

# 创建新分支
echo "🌿 创建功能分支: ${BRANCH_NAME}"
git checkout -b ${BRANCH_NAME} 2>/dev/null || git checkout ${BRANCH_NAME}

# 添加修改的核心文件
echo "📝 添加修改的文件..."
git add src-tauri/Cargo.toml
git add src-tauri/Cargo.lock
git add src-tauri/src/commands/linker.rs
git add src-tauri/src/commands/scanner.rs
git add src-tauri/src/commands/discover.rs
git add src-tauri/src/commands/github_import.rs
git add pnpm-lock.yaml

# 添加文档文件
echo "📄 添加文档文件..."
git add BUGFIX_TILDE_EXPANSION.md
git add BUILD_COMPLETE.md
git add COMMIT_MESSAGE.md
git add FORK_AND_PUSH_GUIDE.md
git add install.sh
git add rust-env.sh
git add setup-fork.sh
git add commit-and-push.sh

# 显示将要提交的内容
echo ""
echo "📋 将要提交的文件:"
git status --short
echo ""

# 确认提交
read -p "确认提交这些变更? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 提交已取消"
    exit 0
fi

# 提交变更
echo "💾 提交变更..."
if [ -f COMMIT_MESSAGE.md ]; then
    git commit -F COMMIT_MESSAGE.md
else
    git commit -m "fix: 展开自定义平台路径中的 ~ 符号，修复 Read-only file system 错误"
fi

# 推送到 fork
echo ""
echo "🚀 推送到 fork 仓库..."
git push -u ${REMOTE_NAME} ${BRANCH_NAME}

echo ""
echo "✅ 推送成功！"
echo ""
echo "🎯 下一步: 创建 Pull Request"
echo "   1. 打开: https://github.com/lixuelin/skills-manage"
echo "   2. 点击 'Compare & pull request' 按钮"
echo "   3. 填写 PR 信息并提交"
echo ""
echo "或者直接访问:"
echo "   https://github.com/iamzhihuix/skills-manage/compare/main...lixuelin:skills-manage:${BRANCH_NAME}"
