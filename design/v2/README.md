# KeilEx — UI Preview v2

> 仅 UI 原型，尚未写入扩展代码。确认后我再替换 `src/` 与 `media/webview/` 并重新打包。

## 这版解决什么

1. **整体放大**：面板铺满编辑器宽度；正文字号 12–13px，输入框 32px 高，行高 30–36px，不再是居中 820px 小弹窗。
2. **Project Items 合并进魔法棒**：作为第 11 个页签，位于 `Utilities` 右侧；不再单独弹窗。原“工程项”命令将直接打开魔法棒并定位到这一页。
3. **文件列表显示全部文件**：默认“全部 13”，每行带 Group 徽标、路径、打开按钮；支持搜索和“当前分组”过滤。单击选中，双击/打开按钮在 VS Code 中打开并直接修改。
4. **KeilEx 品牌**：窗口标题、页签、面板头部、状态栏均使用 KeilEx；实现时同步改 `displayName` / `name`。
5. **每一页重新排版**：
   - Target：A 的双栏 + 新增“更多目标选项”
   - Output：整宽双列
   - C/C++：预处理左栏，语言与代码生成右栏，代码生成 3 列复选
   - Debug：模式/驱动左栏，启动/描述右栏
   - 其余页签统一 section 卡片、150px 标签列、32px 控件

## 预览文件

- 交互原型：`keilex-ui-v2.html`（11 个页签都可点击；文件列表可搜索/过滤/打开）
- 截图：`v2-items.png`、`v2-target.png`、`v2-device.png`、`v2-output.png`、`v2-listing.png`、`v2-user.png`、`v2-cpp.png`、`v2-asm.png`、`v2-linker.png`、`v2-debug.png`、`v2-utilities.png`

## 待确认

- 采用这版布局吗？
- 扩展 ID 是否也改为 `keilex`（显示名 KeilEx）？如果改 ID，需要卸载旧版再安装新版。
