# ✨ 功能完成：用户自定义扫描目录

## 📊 开发进度

### ✅ 已完成

1. **同步原作者更新**
   - ✅ 合并 v0.9.0 版本（33个新提交）
   - ✅ 解决合并冲突
   - ✅ 适配新的代码结构

2. **重新添加自定义扫描目录功能**
   - ✅ 更新 `ScanRoot` 结构（添加 `is_custom` 字段）
   - ✅ 实现后端命令：
     - `add_custom_scan_root`
     - `remove_custom_scan_root`
   - ✅ 使用新的 `path_utils` 模块
   - ✅ 前端 UI 更新：
     - 添加"添加目录"按钮
     - 自定义目录显示删除按钮
     - 错误提示

3. **代码质量**
   - ✅ Rust 代码编译通过
   - ✅ 提交并推送到远程仓库

## 📝 技术实现

### 后端（Rust）

```rust
// 新增字段
pub struct ScanRoot {
    pub path: String,
    pub label: String,
    pub exists: bool,
    pub enabled: bool,
    pub is_custom: bool, // 新增
}

// 新增命令
pub async fn add_custom_scan_root(...) -> Result<ScanRoot, String>
pub async fn remove_custom_scan_root(...) -> Result<(), String>
```

### 前端（TypeScript/React）

- 使用 Tauri dialog API 选择目录
- 自定义目录显示 X 删除按钮
- 集成国际化翻译

## 🎯 使用方法

1. 点击 "Discover" 按钮
2. 在配置对话框中点击 "Add Directory" / "添加目录"
3. 选择任意目录
4. 目录自动添加并启用
5. 自定义目录右侧有删除按钮（X）

## 📦 文件修改

- `src-tauri/src/commands/discover.rs` - 后端逻辑
- `src/components/discover/DiscoverConfigDialog.tsx` - 前端 UI

## 🔍 测试建议

- [ ] 添加自定义目录功能测试
- [ ] 删除自定义目录功能测试
- [ ] 数据持久化测试
- [ ] UI 交互测试

## 📌 注意事项

- 自定义目录存储在 settings 表
- Key: `discover_custom_scan_roots`
- Format: JSON array of paths
- 只能删除自定义目录，预设目录不可删除

---

**开发完成时间**: 2026-04-23
**提交 ID**: `568c727`
