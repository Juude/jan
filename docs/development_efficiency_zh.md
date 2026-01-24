# 增量编译与调试效率指南

本文档旨在帮助开发者了解 Jan 的开发架构，通过合理的增量编译和调试策略，显著提高开发效率。

## 核心架构与开发模式

Jan 采用 **Tauri** 架构，分为前端（Web App）和后端（Rust Core）两部分。

*   **前端**: React + Vite + TailwindCSS
*   **后端**: Rust (Tauri)
*   **连接**: Tauri IPC

为了提高效率，你应该根据当前开发的模块选择合适的开发模式。

## 1. 前端极速开发模式 (Web Only)

如果你只修改 **UI 界面**、**样式** 或 **纯前端逻辑**，**不要** 启动整个 Tauri 应用。

### 启动方式
```bash
yarn dev:web
# 或者在 VSCode 中运行 "Launch Web App (Browser)" 配置
```

### 优势
*   **秒级启动**: 仅启动 Vite Server，无需编译 Rust。
*   **热更新 (HMR)**: 修改代码后浏览器几乎即时刷新。
*   **调试方便**: 直接使用浏览器 DevTools (F12) 或 VSCode JavaScript Debugger。

### 限制
*   无法调用 Tauri 的原生 API (如文件系统、系统通知)。
*   涉及 IPC 通信的功能可能报错或无响应。
*   **解决方案**: 对于纯 UI 开发，这通常不是问题。

---

## 2. 全栈开发与调试模式 (Tauri Desktop)

如果你需要修改 **Rust 后端**，或者前端代码需要调用 **原生 API**，则需要运行完整模式。

### 启动方式
```bash
yarn dev
```

### 增量编译 (Rust)
Rust 的编译速度通常较慢，但 Tauri 和 Cargo 默认支持增量编译：
*   **初次编译**: 可能需要数分钟（下载依赖、编译所有 Crate）。
*   **后续编译**: 仅编译修改过的文件，速度显著提升。
*   **技巧**: 保持 `src-tauri/target` 目录不被清理，以利用缓存。

### 调试 Rust 后端
1.  **日志调试**:
    *   在 Rust 代码中使用 `println!` 或 `log::info!`。
    *   日志会直接输出到启动 `yarn dev` 的终端中。

2.  **断点调试 (VSCode)**:
    *   确保已安装 **CodeLLDB** 插件。
    *   在 `.vscode/launch.json` 中我们已经预置了 `"Tauri: Debug Backend (Rust)"` 配置。
    *   打好断点，按 F5 启动调试。
    *   *注意*: 调试模式构建可能比普通 `dev` 模式稍慢。

---

## 3. VSCode 调试配置

为了进一步提升效率，项目根目录提供了 `.vscode/launch.json`，包含以下配置：

| 配置名称 | 用途 | 适用场景 |
| :--- | :--- | :--- |
| **Launch Web App (Browser)** | 启动 Chrome 调试前端 | 纯 UI 开发，速度最快 |
| **Tauri: Debug Backend (Rust)** | 启动 LLDB 调试后端 | 排查 Rust 崩溃、逻辑错误 |

### 推荐工作流

1.  **日常 UI 开发**:
    *   运行 `yarn dev:web`。
    *   或者 F5 运行 "Launch Web App"。
    *   专注前端，无需等待 Rust 编译。

2.  **功能集成**:
    *   运行 `yarn dev`。
    *   前端代码修改依然支持 HMR（热更新）。
    *   Rust 代码修改后，Tauri 会自动检测并重新编译（此时会有短暂等待）。

3.  **Rust 深度调试**:
    *   停止终端运行的 `yarn dev`。
    *   F5 运行 "Tauri: Debug Backend (Rust)"。
    *   利用断点和变量监视排查底层问题。

## 4. 常见问题与优化

*   **端口冲突**: 默认前端开发端口为 `3001`，Tauri 模式端口为 `1420`。如果遇到端口占用，请检查是否有残留进程。
*   **清理缓存**: 如果遇到奇怪的编译错误，可以尝试运行 `cargo clean` (在 `src-tauri` 目录下)，但这会导致下次编译变慢，请谨慎使用。
*   **依赖更新**: 修改 `Cargo.toml` 后，增量编译可能会失效一次，需要重新计算依赖树。
