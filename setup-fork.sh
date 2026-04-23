#!/bin/bash
# 设置 Fork 仓库为新的 remote

set -e

echo "🔧 配置 Fork 仓库"
echo "===================="
echo ""

FORK_URL="git@github.com:lixuelin/skills-manage.git"
REMOTE_NAME="my-fork"

# 检查 remote 是否已存在
if git remote | grep -q "^${REMOTE_NAME}$"; then
    echo "📝 更新已存在的 remote: ${REMOTE_NAME}"
    git remote set-url ${REMOTE_NAME} ${FORK_URL}
else
    echo "➕ 添加新的 remote: ${REMOTE_NAME}"
    git remote add ${REMOTE_NAME} ${FORK_URL}
fi

echo ""
echo "✅ Remote 配置完成！"
echo ""
echo "📋 当前 remote 列表:"
git remote -v
echo ""
echo "🎯 下一步: 运行 ./commit-and-push.sh 提交变更"
