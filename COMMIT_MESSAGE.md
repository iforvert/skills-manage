fix: 展开自定义平台路径中的 ~ 符号，修复 "Read-only file system" 错误

## 问题
当用户添加自定义平台并使用 `~/.custom/skills/` 格式的路径时，安装 skills 失败：
```
Failed to create agent skills directory: Read-only file system (os error 30)
```

## 原因
Rust 代码没有将路径中的 `~` 展开为用户主目录的实际路径，导致尝试在字面的 `~/` 目录（文件系统根目录下的只读位置）创建文件夹。

## 修复内容

1. **添加 dirs 依赖** (Cargo.toml)
   - 用于跨平台获取用户主目录

2. **创建 expand_tilde() 函数** (linker.rs)
   - 将 `~/path` 展开为 `/Users/username/path`
   - 保持绝对路径和相对路径不变

3. **应用路径展开到所有模块**
   - ✅ linker.rs: install/uninstall skills
   - ✅ scanner.rs: 扫描 agent 目录
   - ✅ discover.rs: 项目技能发现
   - ✅ github_import.rs: 中央目录导入

## 测试
- 内置平台路径展开正常工作
- 自定义平台可以成功创建和安装 skills
- 绝对路径和相对路径保持原样

## 影响范围
- 修复自定义平台无法导入 skills 的问题
- 向后兼容，不影响现有功能
- 所有使用 `global_skills_dir` 的地方都正确处理 `~`

Closes #[issue-number]
