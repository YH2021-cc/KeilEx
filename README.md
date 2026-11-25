# KeilEx

在 VS Code 中打开、编译、配置并同步 **Keil MDK-ARM** 工程。首版只支持 `.uvprojx`（ARM），界面采用深色 Native Workbench 风格，不是 VS Code 默认表单。

## 功能

- **工程操作**：打开/关闭 `.uvprojx`，编译、重新构建、清理、下载，目标切换。
- **侧边栏**：工程树、全部文件树、Target/Group/File 浏览；文件点击打开。
- **魔法棒**：目标、C/C++、汇编、链接器、调试、跟踪、Flash 下载、器件包等设置。
- **编译器选择**：自动检测 ARMCC / ARMCLANG，也可在设置中手动指定。
- **IntelliSense**：把 Keil 的 `IncludePath`、`Define` 同步到工作区 `.vscode/c_cpp_properties.json`；优先使用 ARM GCC 工具链，避免 ARMCC 与 GCC 标准库混用。
- **构建大小**：显示 FLASH / RAM 已用、总量和百分比。Keil 增量编译不输出 `Program Size` 时，从 `.map` 文件读取 `Total RO/RW Size`。
- **界面语言**：中文 / English 切换。
- **Keil 打开**：在 Keil 中打开当前工程。

## 环境要求

- Windows
- Visual Studio Code 1.85 或更高
- Keil MDK-ARM（uVision 5，`UV4.exe`）
- 建议安装 C/C++ 扩展（`ms-vscode.cpptools`）

## 安装

从 VSIX 安装：

```powershell
code --install-extension keil-studio-0.4.2.vsix --force
```

或在 VS Code 中：

```text
Extensions → ... → Install from VSIX...
```

> Marketplace 发布尚在准备中；当前使用 VSIX。

## 使用

1. 打开工程根目录（包含 `Core`、`Drivers`、`MDK-ARM` 的目录），或直接打开 `.uvprojx`。
2. 侧边栏 `KEILEX` 会自动加载工程。
3. 使用侧边栏按钮：
   - 编译 / 重新构建 / 下载
   - 魔法棒 / 项目项 / 在 Keil 打开
4. 切换 `工程 / 全部文件` 查看所有文件。
5. 编译后侧边栏底部显示 FLASH / RAM 使用量。

## 设置

| 设置 | 说明 | 示例 |
| --- | --- | --- |
| `keilStudio.uv4Path` | `UV4.exe` 路径，留空自动检测 | `F:\Keil_v5\UV4\UV4.exe` |
| `keilStudio.armccPath` | ARMCC 路径，留空自动检测 | `F:\Keil_v5\ARM\ARMCC\bin\armcc.exe` |
| `keilStudio.armclangPath` | ARMCLANG 路径，留空自动检测 | `F:\Keil_v5\ARM\ARMCLANG\bin\armclang.exe` |
| `keilStudio.armGccPath` | ARM GCC 路径，用于 IntelliSense | `D:\EmbeddedTool\arm-none-eabi\bin\arm-none-eabi-gcc.exe` |
| `keilStudio.language` | `zh` / `en` / `auto` | `zh` |
| `keilStudio.autoOpenProjectFolder` | 打开工程时自动打开工程文件夹 | `true` |
| `keilStudio.autoRefresh` | 监听工程文件变化并刷新 | `true` |
| `keilStudio.syncIntelliSense` | 自动同步 C/C++ 配置 | `true` |
| `keilStudio.buildBeforeDownload` | 下载前先编译 | `true` |

命令面板还提供：

- `KeilEx: 同步 C/C++ 包含路径`
- `KeilEx: 清理 C/C++ 缓存`
- `KeilEx: 切换中英文`

## 开发

```powershell
npm install
npm run build
npm test
npm run test:webview
npm run package
```

生成 `keil-studio-0.4.2.vsix`。

## 目录

```text
src/                扩展逻辑
src/keil/           Keil 工程解析、编译、配置
src/ui/             Webview 面板
media/webview/      侧边栏、魔法棒、项目项前端
test/               测试与预览
docs/               截图
```

## 已知限制

- 首版只支持 MDK-ARM `.uvprojx`，不支持 C51/C251。
- 驱动设置目前可写 RAM 起始/大小和 Flash 算法，Connect/Reset 等私有选项以界面展示为主。
- C/C++ 解析使用 ARM GCC 工具链；Keil 实际编译仍使用 ARMCC/ARMCLANG。

## 许可证

MIT
