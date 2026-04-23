# 📦 创建 GitHub Release 指南

## ✅ 已完成

- ✅ 构建产物已准备在桌面：
  - `skills-manage_0.8.0_aarch64.dmg` (8.4 MB)
  - `skills-manage_0.8.0_aarch64.app.zip` (8.4 MB)

## 🔐 第一步：登录 GitHub

1. 打开浏览器访问：https://github.com/login
2. 使用 iforvert 账号登录

## 📦 第二步：创建 Release

### 2.1 打开 Release 页面

登录后，访问：
```
https://github.com/iforvert/skills-manage/releases/new
```

或手动导航：
1. 访问 https://github.com/iforvert/skills-manage
2. 点击右侧的 **"Releases"**
3. 点击 **"Draft a new release"**

### 2.2 填写 Release 信息

#### Tag Version
- 点击 **"Choose a tag"**
- 输入: `v0.8.0`
- 点击出现的 **"Create new tag: v0.8.0 on publish"**

#### Target
- 保持默认: `main`

#### Release Title
```
v0.8.0 - 自定义平台路径修复
```

#### Description (复制粘贴)

```markdown
## 🐛 Bug 修复

### 自定义平台路径展开问题
- **问题**: 使用 `~/.custom/skills/` 格式的路径时报错 "Read-only file system (os error 30)"
- **修复**: 自动将 `~` 转换为用户主目录
- **影响**: 所有使用自定义平台的用户

## 🔧 技术细节
- 添加 `dirs` 依赖用于跨平台路径展开
- 创建 `expand_tilde()` 函数
- 应用到所有使用 `global_skills_dir` 的模块：
  - linker.rs (安装/卸载)
  - scanner.rs (扫描)
  - discover.rs (发现)
  - github_import.rs (导入)

## 📦 下载

### macOS (Apple Silicon)
- `skills-manage_0.8.0_aarch64.dmg` (8.4 MB) - 推荐，标准安装包
- `skills-manage_0.8.0_aarch64.app.zip` (8.4 MB) - 便携版，解压即用

## ⚠️ 安装说明

由于应用未签名，首次打开时需执行：

```bash
# 移除 macOS 安全限制
xattr -dr com.apple.quarantine /Applications/skills-manage.app
```

## 🔗 相关链接
- Forked from: https://github.com/iamzhihuix/skills-manage
```

### 2.3 上传文件

点击 **"Attach binaries by dropping them here or selecting them"**

从桌面选择并上传：
- ✅ `skills-manage_0.8.0_aarch64.dmg`
- ✅ `skills-manage_0.8.0_aarch64.app.zip`

**提示**：文件在桌面，直接拖拽到浏览器窗口即可。

### 2.4 发布设置

- ✅ 勾选 **"Set as the latest release"**
- ⬜ 不要勾选 **"Set as a pre-release"**
- ⬜ 不要勾选 **"Save as draft"**

### 2.5 发布

点击绿色按钮 **"Publish release"**

## 🔍 第三步：验证 Release

发布成功后，访问：
```
https://github.com/iforvert/skills-manage/releases
```

应该能看到：
- ✅ Release 标题: v0.8.0 - 自定义平台路径修复
- ✅ DMG 和 ZIP 文件可下载
- ✅ Release notes 显示正确

## 📤 第四步：分享下载链接

发布后的下载链接：
```
https://github.com/iforvert/skills-manage/releases/download/v0.8.0/skills-manage_0.8.0_aarch64.dmg

https://github.com/iforvert/skills-manage/releases/download/v0.8.0/skills-manage_0.8.0_aarch64.app.zip
```

## 🎯 快速命令

```bash
# 1. 打开 GitHub 登录页
open "https://github.com/login"

# 2. 登录后打开 Release 创建页
open "https://github.com/iforvert/skills-manage/releases/new"

# 3. 文件位置（已准备好）
ls -lh ~/Desktop/skills-manage_0.8.0_*
```

## 💡 提示

- 文件总大小约 17 MB，上传可能需要几秒到几分钟
- 如果上传失败，可以尝试分别上传或使用更稳定的网络
- 发布后可以编辑 Release，添加更多信息或更新文件

---

**当前状态**: 🔵 等待在浏览器中登录并创建 Release...

**下一步**: 打开浏览器登录 GitHub，然后按照上述步骤操作 📦
