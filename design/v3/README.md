# KeilEx — UI Preview V3

> 仅 UI 原型，扩展代码尚未修改。确认后我再落到 `src/` / `media/webview/`。

## 按这轮反馈修正

1. **项目项回到侧边栏那一行**
   - 侧边栏子操作行改成三个按钮：`魔法棒` / `项目项` / `在 Keil 打开`。
   - 项目项是独立编辑器页面，不再作为魔法棒页签。
   - “项目项”里列出全部 13 个文件，带分组、路径、打开按钮；双击可直接在 VS Code 打开修改。

2. **中文模式全中文**
   - 10 个页签：`器件 / 目标 / 输出 / 列表 / 用户 / C/C++ / 汇编 / 链接器 / 调试 / 实用工具`。
   - 魔法棒标题、section、字段、复选框、按钮、底部状态全部中文。
   - 按当前 schema 全量渲染 **145 个字段**，不再只放 A 概念图里的少量字段。
   - 技术缩写保留：ARMCC/ARMCLANG、Flash、HEX、DLL、SWD、RTTI、WTE 等。

3. **ARM 编译器可选**
   - 目标页的 `ARM 编译器` 改为下拉框，列出 ARMCC / ARMCLANG 版本；正式实现从 Keil 安装目录和 `pCCUsed` 读取。

4. **C/C++ 包含路径改成 Keil 风格**
   - 不再是一个手动输入的分号文本框。
   - 改成路径列表 + `新建 / 插入 / 删除 / 上移 / 下移 / 浏览…`，与 Keil 的 Include Paths 对话框一致。

5. **调试器有设置界面**
   - 调试页增加 `设置…`，打开 `Cortex-M 目标驱动设置` 对话框。
   - 页签：`调试 / 跟踪 / Flash 下载 / 器件包`。
   - 调试页包含调试适配器、目标通信、调试、SW 设备、缓存选项、下载选项；内容对照你发的 Keil 截图。

6. **其他**
   - 目标页补齐 IROM2 / IRAM2。
   - 实用工具页补齐 Flash 下载、Flash 算法、设置入口。
   - 扩展品牌统一为 **KeilEx**。

## 本轮补充（V3.1）

- **Flash 下载页字段/选项完全按图 1 对齐**：下载功能（擦除全片/擦除扇区/不擦除 + 编程/校验/复位并运行）、RAM 用于算法、编程算法表格（描述/器件容量/器件类型/地址范围）、Add/Remove；视觉仍是 KeilEx 深色 UI，没有换成 Keil 浅灰皮肤。
- **Connect 选项与图 2 完全一致**：`Normal`、`with Pre-reset`、`under Reset`、`Hw reset pulse without Stop`。
- **Reset 选项与图 3 完全一致**：`Autodetect`、`HW RESET`、`SYSRESETREQ`、`VECTRESET`。
- **C/C++ 包含路径可打开**：每行有打开按钮，双击路径也可打开；正式实现会定位到资源管理器。
- 弹窗标签仍按中文模式；Connect/Reset 的配置值保留 Keil 原始英文，避免写回时值不一致。

## 截图

- 侧边栏（三个子操作按钮）：`v3-sidebar.png`
- 目标页：`v3-target.png`
- C/C++（包含路径列表 + 打开）：`v3-cpp.png`、`v3-cpp-open.png`
- Flash 下载页：`v3-flash-dialog.png`
- Connect 下拉：`v3-connect.png`
- Reset 下拉：`v3-reset.png`
- 调试器设置：`v3-debug-settings.png`
- 项目项（全部文件）：`v3-items.png`
- 其余页签：`v3-device.png`、`v3-output.png`、`v3-listing.png`、`v3-user.png`、`v3-asm.png`、`v3-linker.png`、`v3-debug.png`、`v3-utilities.png`

交互原型：`keilex-ui-v3.html`（10 个页签、侧边栏切页、文件过滤/打开、调试设置弹窗均可点）。

## 待确认

1. 这版布局和中文密度可以吗？
2. 扩展 ID 是否也改为 `keilex`（需要卸载旧版）？还是只改显示名 KeilEx、保留旧 ID？
3. 驱动设置弹窗的标签：保持当前中文（Connect/Reset 选项值保留 Keil 英文），还是连标签也照 Keil 英文原样？