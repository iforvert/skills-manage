# Fork 仓库并提交变更指南

## 📋 需要完成的步骤

### 1️⃣ Fork 仓库（手动操作）

**在浏览器中完成**：

1. 打开原仓库: https://github.com/iamzhihuix/skills-manage
2. 点击右上角的 **"Fork"** 按钮
3. 确认账号为 **lixuelin**
4. 点击 **"Create fork"**
5. 等待 fork 完成（通常几秒钟）

### 2️⃣ 更新本地仓库配置（自动脚本）

Fork 完成后，运行以下脚本：

```bash
./setup-fork.sh
```

或者手动执行：

```bash
# 添加你的 fork 为新的 remote
git remote add my-fork git@github.com:lixuelin/skills-manage.git

# 或者如果已存在，更新它
git remote set-url my-fork git@github.com:lixuelin/skills-manage.git

# 查看所有 remote
git remote -v
```

### 3️⃣ 提交变更（自动脚本）

```bash
./commit-and-push.sh
```

或者手动执行：

```bash
# 1. 创建新分支
git checkout -b fix/tilde-path-expansion

# 2. 添加所有修改的文件
git add src-tauri/Cargo.toml
git add src-tauri/Cargo.lock
git add src-tauri/src/commands/linker.rs
git add src-tauri/src/commands/scanner.rs
git add src-tauri/src/commands/discover.rs
git add src-tauri/src/commands/github_import.rs
git add pnpm-lock.yaml

# 3. 添加文档文件
git add BUGFIX_TILDE_EXPANSION.md
git add BUILD_COMPLETE.md
git add COMMIT_MESSAGE.md
git add install.sh
git add rust-env.sh

# 4. 提交变更
git commit -F COMMIT_MESSAGE.md

# 5. 推送到你的 fork
git push my-fork fix/tilde-path-expansion

# 6. 查看推送结果
echo "✅ 代码已推送到你的 fork"
echo "📝 接下来在 GitHub 上创建 Pull Request"
```

### 4️⃣ 创建 Pull Request

推送完成后：

1. 打开你的 fork: https://github.com/lixuelin/skills-manage
2. 会看到黄色提示条 **"Compare & pull request"**
3. 点击该按钮
4. 填写 PR 标题和描述（已自动填充）
5. 点击 **"Create pull request"**

## 🤖 快速自动化

### 一键完成（需要先 Fork）

```bash
# 1. 在浏览器手动 Fork 仓库

# 2. 运行自动化脚本
chmod +x setup-fork.sh commit-and-push.sh
./setup-fork.sh && ./commit-and-push.sh
```

## 📊 当前变更内容

### 修改的文件：
- ✅ `src-tauri/Cargo.toml` - 添加 dirs 依赖
- ✅ `src-tauri/src/commands/linker.rs` - 路径展开核心函数
- ✅ `src-tauri/src/commands/scanner.rs` - 应用路径展开
- ✅ `src-tauri/src/commands/discover.rs` - 应用路径展开
- ✅ `src-tauri/src/commands/github_import.rs` - 应用路径展开
- ✅ `pnpm-lock.yaml` - 依赖锁文件更新

### 新增的文档：
- 📄 `BUGFIX_TILDE_EXPANSION.md` - Bug 修复详细说明
- 📄 `BUILD_COMPLETE.md` - 构建完成文档
- 📄 `COMMIT_MESSAGE.md` - Git 提交信息
- 📄 `install.sh` - 安装脚本
- 📄 `rust-env.sh` - Rust 环境配置

### 修复内容：
🐛 **Bug**: 自定义平台使用 `~/.custom/skills/` 路径时报错 "Read-only file system"
✅ **修复**: 添加 `expand_tilde()` 函数，自动展开 `~` 为用户主目录

## 🔗 相关链接

- **原仓库**: https://github.com/iamzhihuix/skills-manage
- **你的 Fork**: https://github.com/lixuelin/skills-manage (待创建)
- **Pull Request**: 推送后自动生成链接

## ⚠️ 注意事项

1. **Fork 前检查**：确保使用 lixuelin 账号登录 GitHub
2. **分支命名**：使用 `fix/tilde-path-expansion` 作为分支名
3. **提交信息**：已在 COMMIT_MESSAGE.md 中准备好
4. **不提交的文件**：
   - `.codeflicker/` (本地配置)
   - `src-tauri/src/commands/linker_tilde_test.rs` (测试文件，可选)

---

准备好了吗？开始第一步：在浏览器中 Fork 仓库！🚀
