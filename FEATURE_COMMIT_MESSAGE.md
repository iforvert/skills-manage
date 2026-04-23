feat: 支持用户自定义扫描目录

## 新增功能
- 用户可以添加自定义扫描目录
- 用户可以删除自定义扫描目录
- 自定义目录持久化存储

## 技术实现

### 后端
- ScanRoot 结构新增 is_custom 字段
- add_custom_scan_root 命令：添加并验证路径
- remove_custom_scan_root 命令：删除自定义目录
- 自定义目录存储在 settings 表中

### 前端
- DiscoverConfigDialog 新增"添加目录"按钮
- 集成 Tauri dialog API 选择目录
- 自定义目录显示删除按钮
- 新增国际化翻译键

## 文件修改
- src-tauri/src/commands/discover.rs
- src-tauri/src/lib.rs
- src/types/index.ts
- src/stores/discoverStore.ts
- src/components/discover/DiscoverConfigDialog.tsx
- src/i18n/locales/en.json
- src/i18n/locales/zh.json
