# Keil Studio — UI 概念稿（阶段 1）

> 本阶段只做可行性判断与 UI 方向，不包含扩展代码。所有概念稿均为 1800×1180 的自包含 HTML，可直接双击打开。

## 三种方向

| 方案 | 关键词 | 主界面 | 魔法棒 / 工程项 | 适合谁 |
|---|---|---|---|---|
| **A. Native Workbench** | 原生、克制、零学习成本 | VS Code 原生树 + 自定义编辑器页签 | 魔法棒=编辑器页签；工程项=原生模态 | 每天在 VS Code 里写代码的人 |
| **B. Keil Classic, Refined** | 熟悉、三栏、Win32 层级 | 侧边栏 + 经典三栏弹窗 | 工程项=主视觉；魔法棒=经典对话框 | 从 Keil 迁移、不想重学的人 |
| **C. Mission Control** | 仪表盘、目标优先、同步可见 | 卡片式 Dashboard + 设置检查器 | 魔法棒=右侧 Inspector；工程项=三栏卡片 | 多目标、频繁编译下载的项目 |

## 文件

- `concept-a-native.html` / `concept-a-native.png`
- `concept-b-classic.html` / `concept-b-classic.png`
- `concept-c-mission.html` / `concept-c-mission.png`

## 技术结论（简版）

- **1 打开工程**：可行。解析 `.uvprojx` / `.uvproj` / `.uvmpw` 与 `.uvoptx`；本机 Keil 5.43a 自带 `project_projx.xsd`、`project_optx.xsd`。
- **2 编译 / 重编译 / 下载**：可行。`UV4 -b/-r/-c/-f -t -o -j0` 已在本机用 `atk_f103.uvprojx` 实测，退出码 0、日志可解析。
- **3 魔法棒 + Project Items**：界面上可行，工作量大。10 个页签对应 `uvprojx` + `uvoptx` 两组 XML；Device/Pack、调试器驱动、Flash 算法是动态数据。建议 schema 化表单 + 原始 XML 兜底 + “在 Keil 中打开”逃生口。
- **4 目标切换**：可行。`uvoptx` 里每个 Target 有 `<IsCurrentTarget>`；写文件 + `-t` 即可。Keil 打开时需重载。
- **5 中英双语**：可行。VS Code l10n + Webview 文案包 + 状态栏切换。
- **6 与 Keil 直接同步**：**有条件**。编译/下载/目标切换可以做到近实时双向；魔法棒的逐字段实时互刷做不到，因为 Keil 没有公开的设置编辑 API。推荐“文件级双向同步 + 冲突保护 + Apply & Reload Keil”，构建/下载走 UV4 或 UVSOCK。

## 建议起步范围

1. **MVP**：打开/解析、编译/重建/下载、目标切换、双语、文件监听、输出面板。
2. **第二阶段**：魔法棒核心 6 个页签（Device / Target / Output / C-C++ / Debug / Utilities）+ Project Items 三栏。
3. **第三阶段**：剩余页签、嵌套 Settings 对话框、Device Pack 浏览器、UVSOCK 实时桥、冲突合并。

## 待确认

- 选 A / B / C，或组合（如 A 主界面 + B 工程项弹窗 + C 构建卡片）。
- 首版只做 MDK-ARM，还是也要 C51/C251？
- 默认中文，还是跟随 VS Code 显示语言？
