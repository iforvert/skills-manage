# Skills Manager 启动指南

## 项目概述
基于 Tauri v2 的桌面应用，前端使用 React + Vite + TypeScript，后端使用 Rust。应用用于管理 AI Agent 技能包。

### 快速启动

```bash
pnpm tauri dev
```

**启动后访问**：http://localhost:24200

启动后会自动打开桌面应用窗口，同时 Vite 开发服务器运行在 24200 端口。

```yaml
subProjectPath: .
command: pnpm tauri dev
cwd: .
port: 24200
previewUrl: http://localhost:24200
description: Tauri 桌面应用开发模式，包含前端热重载和 Rust 后端
```

## 其他命令

### 仅启动前端开发服务器

```bash
pnpm dev
```

### 构建生产版本

```bash
pnpm tauri build
```

### 运行测试

```bash
pnpm test
```
