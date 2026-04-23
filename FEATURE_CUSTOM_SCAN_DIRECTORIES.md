# ✨ 新功能：用户自定义扫描目录

## 📋 功能说明

在 Discover 功能中，用户现在可以：
- ✅ 添加自定义扫描目录
- ✅ 删除自定义扫描目录
- ✅ 自定义目录与预设目录一起显示

## 🔧 技术实现

### 后端修改 (Rust)

#### 1. 数据结构更新
- `ScanRoot` 结构新增 `is_custom` 字段
- 区分系统预设目录和用户自定义目录

#### 2. 新增命令
- `add_custom_scan_root`: 添加自定义扫描目录
  - 验证路径存在性
  - 检查重复路径
  - 保存到数据库
  
- `remove_custom_scan_root`: 删除自定义扫描目录
  - 只允许删除自定义目录
  - 同步清理启用状态配置

#### 3. 数据持久化
- 自定义目录列表存储在 `settings` 表
- Key: `discover_custom_scan_roots`
- Format: JSON array of paths

### 前端修改 (TypeScript/React)

#### 1. 类型定义
- `ScanRoot` 接口添加 `is_custom?: boolean` 字段

#### 2. Store 更新
- `discoverStore` 新增方法：
  - `addCustomScanRoot(path: string): Promise<ScanRoot>`
  - `removeCustomScanRoot(path: string): Promise<void>`

#### 3. UI 组件更新
- `DiscoverConfigDialog` 新增功能：
  - "添加目录" 按钮
  - 调用 Tauri dialog API 选择目录
  - 自定义目录显示删除按钮
  - 错误提示

#### 4. 国际化
- 新增翻译键：
  - `discover.addDirectory`: "Add Directory" / "添加目录"
  - `discover.selectDirectory`: "Select Directory to Scan" / "选择要扫描的目录"

## 📊 用户体验

### 添加目录流程
1. 用户点击 "Discover" 按钮
2. 在配置对话框中点击 "添加目录"
3. 选择任意目录
4. 目录自动添加并启用

### 删除目录流程
1. 在目录列表中找到自定义目录（带 X 按钮）
2. 点击 X 按钮
3. 目录从列表中移除

## 🎯 设计考虑

1. **安全性**: 只允许删除自定义目录，预设目录不能删除
2. **持久化**: 自定义目录永久保存，重启应用后依然可用
3. **验证**: 添加前验证路径存在性，避免无效目录
4. **去重**: 自动检测并阻止重复添加

## 📝 文件修改清单

### 后端
- `src-tauri/src/commands/discover.rs`
- `src-tauri/src/lib.rs`

### 前端
- `src/types/index.ts`
- `src/stores/discoverStore.ts`
- `src/components/discover/DiscoverConfigDialog.tsx`
- `src/i18n/locales/en.json`
- `src/i18n/locales/zh.json`

## ✅ 测试验证

- [x] Rust 代码编译通过
- [ ] 添加自定义目录功能测试
- [ ] 删除自定义目录功能测试
- [ ] 数据持久化测试
- [ ] UI 交互测试

---

**开发完成时间**: 2026-04-23
