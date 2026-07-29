# PromptX (灵犀) 🚀

[![License](https://img.shields.io/github/license/nicoliustudio/PromptX)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/nicoliustudio/PromptX#参与贡献)

PromptX 是一款致力于减少人机交互摩擦的轻量级辅助工具。我们认为，**用户不仅仅是在管理提示词（Prompts），而是在不断将自己的工作方法（Methodology）沉淀为系统化的能力。**

通过高效的全局触发、无感变量填充与健壮的网页输入框注入技术，PromptX 旨在帮助创作者、开发者与研究者构建属于自己的"数字外挂大脑"。

> **🚀 在线体验：**[https://nicoliustudio.github.io/PromptX/](https://nicoliustudio.github.io/PromptX/)  
> **📖 使用文档：**[完整使用指南](docs/user-guide.md)（含小白上手教程和实战案例）

---

## 💡 为什么选择 PromptX？

在日常使用 ChatGPT、Claude 或 Kimi 等 AIGC 工具时，你是否也面临以下困扰：
*   **心流中断：** 频繁在笔记软件与浏览器之间 `Alt+Tab` 复制粘贴提示词，思路被打断。
*   **填词痛苦：** 提示词中的 `{{变量}}` 需要在聊天框里手动寻找、删除并替换，极易误删结构。
*   **React 状态不同步：** 直接通过脚本修改输入框的值，常常导致网页端的 React/Vue 框架无法感知输入，无法正常发送。

PromptX 针对这些痛点，提供了更为顺滑的解决方案。

---

## ✨ 核心特性

### 1. ⚡️ 零摩擦快捷唤起 (Inline Snippet Expansion)
在任意输入框中输入自设快捷词（如 `/xhs` 或 `\code`）并按下 `Tab`，即可瞬间唤起提示词菜单。双手无需离开键盘。

### 2. 📝 智能变量表单与跳跃 (Interactive Placeholders)
*   **自动表单化：** 自动识别提示词中的 `{{变量}}` 并生成轻量悬浮填空表单，无需手动在长文本中寻找括号。
*   **快速替换：** 插入后支持 `Tab` 键在各个变量间快速定位跳转。

### 3. 🛡️ 健壮的注入引擎 (Robust Injection Engine)
针对现代前端框架进行了深度适配：
*   **选区保护：** 触发下拉菜单时立即锁定当前选区，点击时精确替换，不再因失焦导致位置偏移。
*   **React 合成事件兼容：** 采用 `nativeInputValueSetter` 设值并派发合成事件，确保主流 AI 平台的 React 框架能 100% 感知输入。
*   **富文本支持：** 针对 `contenteditable` 型输入框实现选区恢复与降级注入。
*   **安全兜底：** 若直接注入失败，系统会自动复制到剪贴板并弹出 Toast 提示，不破坏用户工作流。

---

## 🛠️ 技术栈

*   **Extension Core:** Vanilla JS / TypeScript (Manifest V3)
*   **UI Framework:** React + Tailwind CSS (用于后台管理与悬浮表单)
*   **Styling:** Shadcn/ui (轻量、现代的毛玻璃质感组件)

---

## 📅 发展路线图 (Roadmap)

- [x] **Phase 1:** 跑通核心注入引擎（兼容 Textarea & Contenteditable）与 `/` 快捷唤起。
- [x] **Phase 2:** 完善本地提示词仓库（Prompt Vault）与版本管理（Version Control）。
- [x] **Phase 3:** A/B 测试竞技场（基于 API 对比不同版本提示词的输出效果）。
- [x] **Phase 4:** "对话一键提纯"（Chat-to-Prompt）功能，通过分析历史对话自动生成结构化能力卡片。
- [x] **Phase 5:** 支持多 AI 服务商（Gemini / DeepSeek / OpenAI / 自定义），前端安全配置 API Key。

---

## 🤝 参与贡献

我们非常欢迎并感谢任何形式的贡献！无论是提交 Issue 报告 Bug、提出新想法，还是直接提交 Pull Request，都是对本项目巨大的支持。

1. Fork 本项目
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 协议开源。