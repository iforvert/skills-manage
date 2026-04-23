# Bug Fix: 自定义平台无法导入 skills - 路径展开问题

## 问题描述

当尝试安装 skills 到自定义平台时，出现以下错误：

```
安装失败: Failed to create agent skills directory: Read-only file system (os error 30)
```

## 根本原因

代码没有展开路径中的 `~` 符号为实际的用户主目录路径。当用户创建自定义平台并指定路径为 `~/.custom-agent/skills/` 时，Rust 代码直接尝试在字面的 `~` 目录下创建文件夹，而 `~` 在文件系统根目录是只读的，导致错误。

## 修复方案

### 1. 添加 `dirs` 依赖

在 `src-tauri/Cargo.toml` 中添加 `dirs = "5"` 依赖，用于获取用户主目录。

### 2. 创建路径展开函数

在 `src-tauri/src/commands/linker.rs` 中添加 `expand_tilde()` 函数：

```rust
/// Expand `~` in a path to the user's home directory.
pub fn expand_tilde(path: &str) -> PathBuf {
    if path.starts_with("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(&path[2..]);
        }
    }
    PathBuf::from(path)
}
```

### 3. 在所有使用 `global_skills_dir` 的地方应用展开

修复了以下模块：
- `src-tauri/src/commands/linker.rs` - 安装/卸载 skills
- `src-tauri/src/commands/scanner.rs` - 扫描 skills 目录
- `src-tauri/src/commands/discover.rs` - 发现项目 skills
- `src-tauri/src/commands/github_import.rs` - GitHub 导入

## 已修复的文件

1. ✅ `src-tauri/Cargo.toml` - 添加 `dirs` 依赖
2. ✅ `src-tauri/src/commands/linker.rs` - 添加 `expand_tilde()` 函数并应用到安装/卸载逻辑
3. ✅ `src-tauri/src/commands/scanner.rs` - 应用到扫描逻辑
4. ✅ `src-tauri/src/commands/discover.rs` - 应用到发现功能
5. ✅ `src-tauri/src/commands/github_import.rs` - 应用到 GitHub 导入

## 构建和测试

### 前置条件

确保已安装 Rust 工具链：
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 编译检查

```bash
cd src-tauri
cargo check
```

### 运行测试

```bash
# Rust 测试
cd src-tauri
cargo test

# 前端测试
cd ..
pnpm test
```

### 开发模式运行

```bash
pnpm tauri dev
```

### 构建生产版本

```bash
pnpm tauri build
```

## 验证修复

1. 启动应用
2. 进入 Settings（设置）
3. 点击 "Add Platform"（添加平台）
4. 输入：
   - Platform Name: `Test Custom Agent`
   - Global Skills Dir: `~/.test-custom/skills/`
   - Category: `Coding`
5. 点击 Add
6. 应该能成功添加，并且在侧边栏看到新平台
7. 回到 Central Skills，选择任意 skill，点击 Install
8. 勾选刚添加的自定义平台，点击确认
9. 应该能成功安装，不再出现 "Read-only file system" 错误

## 影响范围

此修复影响所有使用 `global_skills_dir` 路径的功能：
- ✅ 扫描自定义平台的 skills 目录
- ✅ 安装 skills 到自定义平台（symlink 和 copy 模式）
- ✅ 从自定义平台卸载 skills
- ✅ Discover 功能识别自定义平台
- ✅ GitHub 导入到中央目录

## 注意事项

- 此修复向后兼容，不影响已有功能
- 内置平台的路径硬编码为 `~/...` 格式，现在也能正确展开
- 如果用户输入绝对路径（不以 `~/` 开头），路径保持不变
- `expand_tilde()` 函数是 `pub` 的，可以在其他模块中复用
